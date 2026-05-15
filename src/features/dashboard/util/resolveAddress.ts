import { DateTime } from "luxon";
import { Bleacher } from "../types";
import { resolveLastKnownAddress } from "@/features/alerts/util/resolveLastKnownAddress";

/**
 * Resolve the most recent address for a bleacher at a given date.
 *
 * Logic:
 * - Look backwards from the target date for the most recent event (by eventStart)
 *   or work tracker (by date) that has an address.
 * - If both fall on the same date, prefer the event.
 * - Events use `address` (street); work trackers use `dropoffAddress` (street).
 */
export function resolveAddress(bleacher: Bleacher, targetDate: string): string | null {
  const entries = [
    ...bleacher.bleacherEvents
      .map((ev) => {
        const startDate = DateTime.fromISO(ev.eventStart).toISODate();
        return startDate && ev.address
          ? { date: startDate, street: ev.address, source: "event" as const }
          : null;
      })
      .filter(Boolean) as { date: string; street: string; source: "event" }[],
    ...bleacher.workTrackers
      .filter((wt) => wt.date && wt.dropoffAddress)
      .map((wt) => ({
        date: wt.date,
        street: wt.dropoffAddress!,
        source: "work_tracker" as const,
      })),
  ];

  return resolveLastKnownAddress(entries, targetDate);
}
