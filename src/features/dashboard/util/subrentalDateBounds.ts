import { useMemo } from "react";
import { Bleacher } from "../types";

/** Returns the later of two optional YYYY-MM-DD strings. */
export function laterDate(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/** Returns the earlier of two optional YYYY-MM-DD strings. */
export function earlierDate(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

/**
 * Given a set of selected bleacher UUIDs and the current form date range, computes:
 *
 * - `blockDerivedStartMin` — day after the end of the latest accepted subrental block
 *   whose start is at or before `eventEnd`. Prevents dragging eventStart into or before
 *   a block that ends within the current range.
 *
 * - `blockDerivedEndMax` — day before the start of the earliest accepted subrental block
 *   whose start is at or after `eventStart`. Prevents dragging eventEnd past the next
 *   subrental block.
 *
 * Both values are `undefined` when there are no relevant blocks.
 */
export function useSubrentalBlockBounds(
  bleacherUuids: string[],
  allBleachers: Bleacher[],
  eventStart: string | null | undefined,
  eventEnd: string | null | undefined,
  subrentalConstraint?: { eventStart: string; eventEnd: string } | null,
): { blockDerivedStartMin: string | undefined; blockDerivedEndMax: string | undefined } {
  const subrentalBlocks = useMemo(() => {
    const uuids = new Set(bleacherUuids);
    return (
      allBleachers
        .filter((b) => !b.isSubrentalRow && uuids.has(b.bleacherUuid))
        .flatMap((b) => b.acceptedSubrentalBlocks ?? [])
        .map((r) => ({
          start: r.eventStart.substring(0, 10),
          end: r.eventEnd.substring(0, 10),
        }))
        // When inside a subrental window, exclude the block that IS that window —
        // otherwise blockDerivedEndMax becomes day-before-block-start = day before
        // the constraint start, making min > max and no dates selectable.
        .filter((b) => {
          if (!subrentalConstraint) return true;
          const srStart = subrentalConstraint.eventStart.substring(0, 10);
          const srEnd = subrentalConstraint.eventEnd.substring(0, 10);
          // Exclude any block that overlaps the subrental constraint window
          return b.end < srStart || b.start > srEnd;
        })
    );
  }, [allBleachers, bleacherUuids, subrentalConstraint]);

  const blockDerivedStartMin = useMemo(() => {
    const end = eventEnd?.substring(0, 10);
    if (!end || !subrentalBlocks.length) return undefined;
    const preceding = subrentalBlocks
      .filter((b) => b.start <= end)
      .sort((a, b) => b.end.localeCompare(a.end))[0];
    if (!preceding) return undefined;
    const d = new Date(preceding.end + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split("T")[0];
  }, [subrentalBlocks, eventEnd]);

  const blockDerivedEndMax = useMemo(() => {
    const start = eventStart?.substring(0, 10);
    if (!start || !subrentalBlocks.length) return undefined;
    const upcoming = subrentalBlocks
      .filter((b) => b.start >= start)
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    if (!upcoming) return undefined;
    const d = new Date(upcoming.start + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split("T")[0];
  }, [subrentalBlocks, eventStart]);

  return { blockDerivedStartMin, blockDerivedEndMax };
}
