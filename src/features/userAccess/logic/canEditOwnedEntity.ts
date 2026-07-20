export function canEditOwnedEntity(params: {
  isAdmin: boolean;
  isNew: boolean;
  canCreate?: boolean;
  isAccountManager?: boolean;
  leadZoneIds?: string[];
  accountManagerZoneIds?: string[];
  createdByUserId?: string | null;
  assignedUserId?: string | null;
  userId?: string | null;
  /**
   * Zones of every bleacher currently attached to the event being edited.
   * Part 3 gate: if any bleacher sits in a zone the caller cannot access
   * (not in accountManagerZoneIds), only the event owner — createdByUserId
   * === userId — may modify/delete. Defaults to [] so other entity callers
   * (work trackers, maintenance, quotes) are unaffected.
   */
  eventBleacherZoneIds?: string[];
}): boolean {
  const {
    isAdmin,
    isNew,
    canCreate = true,
    isAccountManager = false,
    leadZoneIds = [],
    accountManagerZoneIds = [],
    createdByUserId,
    assignedUserId,
    userId,
    eventBleacherZoneIds = [],
  } = params;

  if (isAdmin) return true;
  if (isNew) return canCreate;
  if (!canCreate) return false;

  // Part 3: event has ≥1 bleacher in a zone I can't access → owner only.
  // accountManagerZoneIds already includes lead zones, so it is the full set
  // of zones the caller has access to.
  const hasInaccessibleBleacher = eventBleacherZoneIds.some(
    (z) => !!z && !accountManagerZoneIds.includes(z),
  );
  if (hasInaccessibleBleacher) {
    if (!userId) return false;
    return !!createdByUserId && createdByUserId === userId;
  }

  // Lead in any zone → full edit on all entities
  if (leadZoneIds.length > 0) return true;

  // Junior AM → own or assigned only
  if (isAccountManager || accountManagerZoneIds.length > 0) {
    if (!userId) return false;
    return (!!createdByUserId && createdByUserId === userId) ||
           (!!assignedUserId && assignedUserId === userId);
  }

  // Non-AM callers (backwards compat — EventConfigurationForm, MaintenanceEventForm)
  return true;
}

export function canSendQuote(params: {
  isAdmin: boolean;
  leadZoneIds: string[];
}): boolean {
  if (params.isAdmin) return true;
  // Lead in any zone can send quotes (quotes aren't zone-bound)
  return params.leadZoneIds.length > 0;
}
