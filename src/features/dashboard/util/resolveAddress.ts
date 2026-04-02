import { DateTime } from "luxon";
import { Bleacher } from "../types";

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
  let bestEventDate: string | null = null;
  let bestEventAddress: string | null = null;

  for (const ev of bleacher.bleacherEvents) {
    const startDate = DateTime.fromISO(ev.eventStart).toISODate();
    if (!startDate || startDate > targetDate) continue;
    if (!ev.address) continue;
    if (!bestEventDate || startDate > bestEventDate) {
      bestEventDate = startDate;
      bestEventAddress = ev.address;
    }
  }

  let bestWtDate: string | null = null;
  let bestWtAddress: string | null = null;

  for (const wt of bleacher.workTrackers) {
    if (!wt.date || wt.date > targetDate) continue;
    if (!wt.dropoffAddress) continue;
    if (!bestWtDate || wt.date > bestWtDate) {
      bestWtDate = wt.date;
      bestWtAddress = wt.dropoffAddress;
    }
  }

  // Both found: prefer the one with the later date, or event if same date
  if (bestEventDate && bestWtDate) {
    if (bestEventDate >= bestWtDate) return bestEventAddress;
    return bestWtAddress;
  }

  return bestEventAddress ?? bestWtAddress;
}
