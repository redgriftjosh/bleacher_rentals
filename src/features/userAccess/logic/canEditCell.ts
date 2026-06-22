import { isBleacherOwnedByAM } from "./isBleacherOwnedByAM";

/**
 * Pure function: determines if the current user can edit a dashboard cell.
 *
 * - Admin: always true
 * - Viewer (!isAdmin && !isAccountManager): always false
 * - AM: true only when the bleacher is in one of their assigned zones
 */
export function canEditCell(params: {
  isAdmin: boolean;
  isAccountManager: boolean;
  accountManagerZoneIds: string[];
  bleacherUuid: string | null;
  bleacher: {
    zoneUuid: string | null | undefined;
  } | null;
}): boolean {
  const { isAdmin, isAccountManager, accountManagerZoneIds, bleacherUuid, bleacher } = params;

  if (isAdmin) return true;

  if (!isAccountManager) return false;

  if (!bleacherUuid || !bleacher) return false;

  return isBleacherOwnedByAM({
    bleacherZoneUuid: bleacher.zoneUuid,
    accountManagerZoneIds,
  });
}
