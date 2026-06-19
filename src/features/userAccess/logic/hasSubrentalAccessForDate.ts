import { Bleacher } from "@/features/dashboard/types";

/** Returns true if two date ranges overlap (inclusive, YYYY-MM-DD strings). */
function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

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

/**
 * Checks whether a bleacher is blocked for the given date range because it has
 * been subrented out (accepted subrental blocks overlap the range).
 *
 * Used on the ORIGINAL row to prevent the owning AM from adding a bleacher
 * to an event that falls inside a period it's already promised to another zone.
 */
export function isSubrentedOutDuringRange(params: {
  bleacher: Bleacher | null | undefined;
  eventStart: string | null | undefined;
  eventEnd: string | null | undefined;
}): boolean {
  const { bleacher, eventStart, eventEnd } = params;
  if (!bleacher || !eventStart || !eventEnd) return false;

  return (bleacher.acceptedSubrentalBlocks ?? []).some((r) =>
    rangesOverlap(
      eventStart.substring(0, 10),
      eventEnd.substring(0, 10),
      r.eventStart.substring(0, 10),
      r.eventEnd.substring(0, 10),
    ),
  );
}

/**
 * Checks whether an account manager has subrental access to a bleacher for the
 * entire given date range (not just a single date).
 *
 * Used on SUBRENTAL ROWS to allow an AM to add a borrowed bleacher to an event
 * as long as the event falls within the accepted subrental window.
 */
export function hasSubrentalAccessForRange(params: {
  bleacherUuid: string | null | undefined;
  eventStart: string | null | undefined;
  eventEnd: string | null | undefined;
  accountManagerZoneIds: string[];
  allBleachers: Bleacher[];
}): boolean {
  const { bleacherUuid, eventStart, eventEnd, accountManagerZoneIds, allBleachers } = params;

  if (!bleacherUuid || !eventStart || !eventEnd || accountManagerZoneIds.length === 0) return false;

  const evStart = eventStart.substring(0, 10);
  const evEnd = eventEnd.substring(0, 10);

  // The entire event range must be fully contained within a single subrental window.
  // Overlapping two separate windows (e.g. Jan 1–5 and Jan 10–15) is not enough —
  // there would be a gap in between where the AM has no access.
  return allBleachers.some(
    (b) =>
      b.bleacherUuid === bleacherUuid &&
      b.isSubrentalRow &&
      accountManagerZoneIds.includes(b.zoneUuid ?? "") &&
      (b.acceptedSubrentalAccess ?? []).some(
        (r) => evStart >= r.eventStart.substring(0, 10) && evEnd <= r.eventEnd.substring(0, 10),
      ),
  );
}
