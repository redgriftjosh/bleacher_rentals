/**
 * Pure function: determines if the current user can edit a work tracker.
 *
 * Admin or AM — always.
 * Viewer — blocked (canCreate=false).
 */
export function canEditWorkTracker(params: {
  isAdmin: boolean;
  isAccountManager: boolean;
  isNew: boolean;
  canCreate?: boolean;
}): boolean {
  const { isAdmin, isAccountManager, isNew, canCreate = true } = params;

  if (isAdmin) return true;
  if (isNew) return canCreate;
  return isAccountManager;
}
