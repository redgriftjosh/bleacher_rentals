import { Bleacher } from "@/features/dashboard/types";

/**
 * Checks whether an account manager has access to a bleacher on a specific date
 * via an accepted subrental targeting one of their zones.
 *
 * Used as a fallback when the bleacher is not directly owned by the AM —
 * i.e. the bleacher belongs to another zone but has been subrented into
 * one of the AM's zones for a date range.
 */
export function hasSubrentalAccessForDate(params: {
  bleacherUuid: string | null | undefined;
  date: string | null | undefined;
  accountManagerZoneIds: string[];
  allBleachers: Bleacher[];
}): boolean {
  const { bleacherUuid, date, accountManagerZoneIds, allBleachers } = params;

  if (!bleacherUuid || !date || accountManagerZoneIds.length === 0) return false;

  return allBleachers.some(
    (b) =>
      b.bleacherUuid === bleacherUuid &&
      b.isSubrentalRow &&
      accountManagerZoneIds.includes(b.zoneUuid ?? "") &&
      (b.acceptedSubrentalAccess ?? []).some(
        (r) => date >= r.eventStart.substring(0, 10) && date <= r.eventEnd.substring(0, 10),
      ),
  );
}
