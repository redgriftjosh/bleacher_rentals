/**
 * Pure function: filters a list of bleachers to only those assigned to a
 * specific account manager (summer OR winter).
 *
 * When accountManagerId is null/undefined, returns all bleachers (admin path).
 */
export type BleacherWithAM = {
  id: string;
  bleacher_number: number;
  summer_account_manager_uuid: string | null;
  winter_account_manager_uuid: string | null;
};

export function filterBleachersByAM(
  bleachers: BleacherWithAM[],
  accountManagerId: string | null | undefined,
): BleacherWithAM[] {
  if (!accountManagerId) return bleachers;

  return bleachers.filter(
    (b) =>
      b.summer_account_manager_uuid === accountManagerId ||
      b.winter_account_manager_uuid === accountManagerId,
  );
}
