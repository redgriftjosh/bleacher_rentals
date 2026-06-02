/**
 * Pure function: determines if the current user can edit an entity that uses
 * simple ownership (Events, MaintenanceEvents).
 *
 * Admin — always.
 * AM creating a new entity — allowed (canCreate defaults to true for backwards compat).
 * Viewer creating — blocked when canCreate=false.
 * AM on existing entity — only if ownerUserUuid matches their userId.
 */
export function canEditOwnedEntity(params: {
  isAdmin: boolean;
  isNew: boolean;
  currentUserId: string | null;
  ownerUserUuid: string | null | undefined;
  /** Whether the current user is allowed to create new entities (AM=true, Viewer=false). Defaults to true. */
  canCreate?: boolean;
}): boolean {
  const { isAdmin, isNew, currentUserId, ownerUserUuid, canCreate = true } = params;

  if (isAdmin) return true;
  if (isNew) return canCreate;

  return !!currentUserId && ownerUserUuid === currentUserId;
}
