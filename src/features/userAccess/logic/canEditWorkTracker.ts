/**
 * Pure function: determines if the current user can edit a work tracker.
 *
 * Admin — always.
 * AM creating a new WT — allowed (canCreate defaults to true for backwards compat).
 * Viewer creating — blocked when canCreate=false.
 * AM on existing WT — only if they created it OR the WT's driver is assigned to them.
 */
export function canEditWorkTracker(params: {
  isAdmin: boolean;
  isNew: boolean;
  /** Users.id of the current user (from permissions store) */
  currentUserId: string | null;
  /** created_by_user_uuid from the fetched work tracker row */
  createdByUserId: string | null | undefined;
  /** driver_uuid from the work tracker */
  driverUuid: string | null | undefined;
  /** driver UUIDs that belong to the current AM (from the filtered useDrivers hook) */
  ownDriverUuids: string[];
  /** Whether the current user is allowed to create new entities (AM=true, Viewer=false). Defaults to true. */
  canCreate?: boolean;
}): boolean {
  const { isAdmin, isNew, currentUserId, createdByUserId, driverUuid, ownDriverUuids, canCreate = true } = params;

  if (isAdmin) return true;
  if (isNew) return canCreate;

  const isOwner = !!currentUserId && createdByUserId === currentUserId;
  const hasOwnDriver = !!driverUuid && ownDriverUuids.includes(driverUuid);

  return isOwner || hasOwnDriver;
}
