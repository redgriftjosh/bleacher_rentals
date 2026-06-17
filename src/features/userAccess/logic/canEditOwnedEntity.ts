/**
 * Pure function: determines if the current user can edit an entity
 * (Events, MaintenanceEvents).
 *
 * Admin or AM — always.
 * Viewer creating — blocked when canCreate=false.
 */
export function canEditOwnedEntity(params: {
  isAdmin: boolean;
  isNew: boolean;
  canCreate?: boolean;
}): boolean {
  const { isAdmin, isNew, canCreate = true } = params;

  if (isAdmin) return true;
  if (isNew) return canCreate;
  return canCreate;
}
