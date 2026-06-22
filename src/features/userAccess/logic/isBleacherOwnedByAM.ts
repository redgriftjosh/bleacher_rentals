/**
 * Checks if a bleacher belongs to the given account manager via zone assignment.
 */
export function isBleacherOwnedByAM(params: {
  bleacherZoneUuid: string | null | undefined;
  accountManagerZoneIds: string[];
}): boolean {
  const { bleacherZoneUuid, accountManagerZoneIds } = params;

  if (!bleacherZoneUuid || accountManagerZoneIds.length === 0) return false;

  return accountManagerZoneIds.includes(bleacherZoneUuid);
}
