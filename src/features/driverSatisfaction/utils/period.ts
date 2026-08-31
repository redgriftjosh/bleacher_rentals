/**
 * Which answers the page is looking at.
 *
 * This is the page-wide filter: every tile, the trend line and the list all
 * read the same slice of time. That is the difference between it and the score
 * filter, which narrows the list alone (see `scoreFilter.ts`).
 *
 * Presets snap to the start of a bucket rather than counting back N days. An
 * unsnapped start leaves the oldest column holding a partial week or month,
 * and a half-bucket plotted beside full ones reads as a dip that never
 * happened.
 */

import { DateTime } from "luxon";
import type { SatisfactionRow } from "./aggregate";
import type { Granularity } from "./aggregate";

export type PeriodPreset = "1w" | "1m" | "6m" | "12m" | "all" | "custom";

export type PeriodSelection = {
  preset: PeriodPreset;
  /** Zoom level of the trend line. Independent of the range. */
  granularity: Granularity;
  /** `YYYY-MM-DD`, custom preset only. `null` = open at that end. */
  from: string | null;
  to: string | null;
};

/**
 * Twelve months by month, because the survey itself is monthly: a driver
 * answers once every 30 days, so a shorter default or a weekly one opens on a
 * chart with one point per driver and gaps between them.
 */
export const DEFAULT_PERIOD: PeriodSelection = {
  preset: "12m",
  granularity: "month",
  from: null,
  to: null,
};

export type ResolvedPeriod = {
  /** `YYYY-MM-DD`, inclusive. `null` = unbounded. */
  start: string | null;
  /** `YYYY-MM-DD`, inclusive — the whole of that day counts. */
  end: string | null;
};

const ISO_DATE = "yyyy-MM-dd";

export function resolvePeriod(selection: PeriodSelection, now: number): ResolvedPeriod {
  const today = DateTime.fromMillis(now);

  switch (selection.preset) {
    // Every "Last N" is a trailing window that INCLUDES the current, still-open
    // bucket — so "Last week" is this week from Monday, and "Last 6 months" is
    // this month plus the five before it. Consistent across the family; a
    // completed-period-only reading would make the newest answers invisible
    // until the bucket closed.
    case "1w":
      return { start: today.startOf("week").toFormat(ISO_DATE), end: null };
    case "1m":
      return { start: today.startOf("month").toFormat(ISO_DATE), end: null };
    case "6m":
      return {
        start: today.startOf("month").minus({ months: 5 }).toFormat(ISO_DATE),
        end: null,
      };
    case "12m":
      return {
        start: today.startOf("month").minus({ months: 11 }).toFormat(ISO_DATE),
        end: null,
      };
    case "custom":
      return { start: selection.from, end: selection.to };
    case "all":
    default:
      return { start: null, end: null };
  }
}

/**
 * An answer whose timestamp cannot be read belongs to no period. It survives
 * "All time" — it is still somebody's opinion, and the list should show it —
 * but no range can contain it without inventing a date.
 */
export function filterByPeriod(
  rows: readonly SatisfactionRow[],
  selection: PeriodSelection,
  now: number,
): SatisfactionRow[] {
  const { start, end } = resolvePeriod(selection, now);
  if (start === null && end === null) return [...rows];

  const startMs = start ? DateTime.fromISO(start).startOf("day").toMillis() : null;
  // Inclusive of the whole final day: a range ending "Aug 15" must contain an
  // answer given at 23:59 on the 15th.
  const endMs = end ? DateTime.fromISO(end).endOf("day").toMillis() : null;

  return rows.filter((row) => {
    if (!row.submittedAt) return false;
    const at = DateTime.fromISO(row.submittedAt);
    if (!at.isValid) return false;

    const ms = at.toMillis();
    if (startMs !== null && ms < startMs) return false;
    if (endMs !== null && ms > endMs) return false;
    return true;
  });
}

const PRESET_LABEL: Record<Exclude<PeriodPreset, "custom">, string> = {
  "1w": "Last week",
  "1m": "Last month",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  all: "All time",
};

const pretty = (iso: string): string => DateTime.fromISO(iso).toFormat("MMM d, yyyy");

/** How the current period reads in prose — for headings and empty states. */
export function describePeriod(selection: PeriodSelection, now: number): string {
  if (selection.preset !== "custom") return PRESET_LABEL[selection.preset];

  const { start, end } = resolvePeriod(selection, now);
  if (start && end) {
    const from = DateTime.fromISO(start);
    const to = DateTime.fromISO(end);
    // Same year on both ends: name it once, at the end.
    return from.year === to.year
      ? `${from.toFormat("MMM d")} - ${to.toFormat("MMM d")}, ${to.year}`
      : `${pretty(start)} - ${pretty(end)}`;
  }
  if (start) return `Since ${pretty(start)}`;
  if (end) return `Up to ${pretty(end)}`;
  return "All time";
}
