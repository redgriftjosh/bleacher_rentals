/**
 * Pure function: determines if the current user can edit a work tracker.
 *
 * Admin — always.
 * AM — if the WT's bleacher has them as summer or winter account manager.
 * New WT — allowed for admin + AM (blocked for viewer via canCreate).
 * Everyone else — blocked.
 */
export function canEditWorkTracker(params: {
  isAdmin: boolean;
  isAccountManager: boolean;
  isNew: boolean;
  /** The current user's AccountManagers.id */
  currentAccountManagerId: string | null;
  /** summer_account_manager_uuid from the WT's bleacher */
  bleacherSummerAmUuid: string | null | undefined;
  /** winter_account_manager_uuid from the WT's bleacher */
  bleacherWinterAmUuid: string | null | undefined;
  /** Whether the current user is allowed to create new entities (AM=true, Viewer=false). Defaults to true. */
  canCreate?: boolean;
}): boolean {
  const {
    isAdmin,
    isAccountManager,
    isNew,
    currentAccountManagerId,
    bleacherSummerAmUuid,
    bleacherWinterAmUuid,
    canCreate = true,
  } = params;

  if (isAdmin) return true;
  if (isNew) return canCreate;

  if (isAccountManager && currentAccountManagerId) {
    return (
      bleacherSummerAmUuid === currentAccountManagerId ||
      bleacherWinterAmUuid === currentAccountManagerId
    );
  }

  return false;
}
