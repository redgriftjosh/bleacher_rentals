import { createErrorToast } from "@/components/toasts/ErrorToast";
import { useMemo } from "react";

/**
 * Get the current date ("2026-01-01") in local time, suitable for matching against date keys.
 */
export function getCurrentDay(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getLastPeriodSameElapsedDayKey(
  thisPeriodDays: string[],
  lastPeriodDays: string[],
  currentDay: string,
): string {
  const thisPeriodElapsedIndex = useMemo(() => {
    const index = thisPeriodDays.indexOf(currentDay);
    if (index >= 0) return index;
    if (thisPeriodDays.length === 0) return -1;
    if (currentDay < thisPeriodDays[0]) return -1;
    return thisPeriodDays.length - 1;
  }, [thisPeriodDays, currentDay]);

  const lastPeriodSameElapsedDayKey =
    thisPeriodElapsedIndex >= 0
      ? lastPeriodDays[Math.min(thisPeriodElapsedIndex, lastPeriodDays.length - 1)]
      : undefined;

  if (!lastPeriodSameElapsedDayKey) {
    // error toast
    createErrorToast([
      "Could not determine the corresponding day in the last period.",
      `This is likely a bug. Please report this to the developers.`,
    ]);
  }
  return lastPeriodSameElapsedDayKey;
}

export function toLocalDateKey(input: string) {
  // If input is a bare date (YYYY-MM-DD), append T00:00:00 to avoid UTC parsing.
  const safe = input.includes("T") ? input : `${input}T00:00:00`;
  const d = new Date(safe);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getDateKeys(startIso: string, endIsoExclusive: string) {
  // Append T00:00:00 to force local-time parsing. Without it, new Date("2026-01-01")
  // is parsed as UTC midnight, which in negative-offset timezones (e.g. EST) falls on
  // the previous local date — causing an off-by-one that silently breaks aggregation.
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIsoExclusive}T00:00:00`);
  const keys: string[] = [];

  const cursor = new Date(start);
  while (cursor < end) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getDate()).padStart(2, "0");
    keys.push(`${yyyy}-${mm}-${dd}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export const isWeekdayKey = (dateKey: string) => {
  const d = new Date(`${dateKey}T00:00:00`); // local midnight, no UTC drift
  const day = d.getDay(); // 0=Sun,6=Sat
  return day >= 1 && day <= 5;
};
