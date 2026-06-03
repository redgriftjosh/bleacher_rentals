import { isBleacherOwnedByAM } from "./isBleacherOwnedByAM";

/**
 * Pure function: determines if the current user can edit a dashboard cell.
 *
 * - Admin: always true
 * - Viewer (!isAdmin && !isAccountManager): always false
 * - AM: true only when the bleacher is assigned to them (summer or winter)
 */
export function canEditCell(params: {
  isAdmin: boolean;
  isAccountManager: boolean;
  accountManagerId: string | null;
  bleacherUuid: string | null;
  /** Bleacher data — only the AM assignment fields are needed */
  bleacher: {
    summerAccountManagerUuid: string | null | undefined;
    winterAccountManagerUuid: string | null | undefined;
  } | null;
}): boolean {
  const { isAdmin, isAccountManager, accountManagerId, bleacherUuid, bleacher } = params;

  if (isAdmin) return true;

  // Viewer — no admin, no AM role
  if (!isAccountManager) return false;

  // AM: need a bleacher to check ownership
  if (!bleacherUuid || !bleacher) return false;

  return isBleacherOwnedByAM({
    summerAccountManagerUuid: bleacher.summerAccountManagerUuid,
    winterAccountManagerUuid: bleacher.winterAccountManagerUuid,
    currentAccountManagerId: accountManagerId,
  });
}
