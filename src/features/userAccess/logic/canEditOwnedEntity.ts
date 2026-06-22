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
  } = params;

  if (isAdmin) return true;
  if (isNew) return canCreate;
  if (!canCreate) return false;

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
