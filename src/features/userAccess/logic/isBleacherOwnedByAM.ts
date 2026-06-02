/**
 * Pure function: checks if a bleacher is assigned to the given account manager
 * (summer OR winter assignment).
 *
 * Used by CellEditor to block AM from creating events / maintenance on
 * bleachers that don't belong to them.
 */
export function isBleacherOwnedByAM(params: {
  summerAccountManagerUuid: string | null | undefined;
  winterAccountManagerUuid: string | null | undefined;
  currentAccountManagerId: string | null;
}): boolean {
  const { summerAccountManagerUuid, winterAccountManagerUuid, currentAccountManagerId } = params;

  if (!currentAccountManagerId) return false;

  return (
    summerAccountManagerUuid === currentAccountManagerId ||
    winterAccountManagerUuid === currentAccountManagerId
  );
}
