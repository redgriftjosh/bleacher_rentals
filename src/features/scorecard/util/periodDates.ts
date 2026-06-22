import { DateTime } from "luxon";
import { TimeRange } from "../hooks/queries/useEventsWithinTimeRange";

export type PeriodBounds = {
  thisStart: string; // YYYY-MM-DD
  thisEnd: string; // YYYY-MM-DD (exclusive, first day AFTER the period)
  lastStart: string;
  lastEnd: string; // same as thisStart
};

/**
 * Compute period boundaries given a time range and an optional anchor date.
 * If no anchor is provided, uses today.
 *
 * For weekly: anchor is always snapped to Monday.
 * For quarterly: anchor is snapped to start of quarter.
 * For annually: anchor is snapped to start of year.
 */
export function getPeriodBounds(timeRange: TimeRange, anchor?: string | null): PeriodBounds {
  const dt = anchor ? DateTime.fromISO(anchor) : DateTime.local();
  const now = dt.isValid ? dt : DateTime.local();

  if (timeRange === "quarterly") {
    const thisStart = now.startOf("quarter");
    const thisEnd = thisStart.plus({ quarters: 1 });
    const lastStart = thisStart.minus({ quarters: 1 });
    return {
      thisStart: thisStart.toFormat("yyyy-MM-dd"),
      thisEnd: thisEnd.toFormat("yyyy-MM-dd"),
      lastStart: lastStart.toFormat("yyyy-MM-dd"),
      lastEnd: thisStart.toFormat("yyyy-MM-dd"),
    };
  }

  if (timeRange === "annually") {
    const thisStart = now.startOf("year");
    const thisEnd = thisStart.plus({ years: 1 });
    const lastStart = thisStart.minus({ years: 1 });
    return {
      thisStart: thisStart.toFormat("yyyy-MM-dd"),
      thisEnd: thisEnd.toFormat("yyyy-MM-dd"),
      lastStart: lastStart.toFormat("yyyy-MM-dd"),
      lastEnd: thisStart.toFormat("yyyy-MM-dd"),
    };
  }

  // weekly — snap to Monday
  const thisStart = now.startOf("week"); // Luxon weeks start Monday
  const thisEnd = thisStart.plus({ weeks: 1 });
  const lastStart = thisStart.minus({ weeks: 1 });
  return {
    thisStart: thisStart.toFormat("yyyy-MM-dd"),
    thisEnd: thisEnd.toFormat("yyyy-MM-dd"),
    lastStart: lastStart.toFormat("yyyy-MM-dd"),
    lastEnd: thisStart.toFormat("yyyy-MM-dd"),
  };
}

export type PeriodOption = {
  value: string; // the anchor date (YYYY-MM-DD)
  label: string; // display label
};

/**
 * Generate a list of period options for the dropdown.
 * Most recent first.
 */
export function getPeriodOptions(timeRange: TimeRange, count: number = 12): PeriodOption[] {
  const now = DateTime.local();
  const options: PeriodOption[] = [];

  if (timeRange === "weekly") {
    let monday = now.startOf("week");
    for (let i = 0; i < count; i++) {
      options.push({
        value: monday.toFormat("yyyy-MM-dd"),
        label: `${monday.toFormat("MMM d")} - ${monday.plus({ days: 6 }).toFormat("MMM d")}`,
      });
      monday = monday.minus({ weeks: 1 });
    }
  } else if (timeRange === "quarterly") {
    let quarterStart = now.startOf("quarter");
    for (let i = 0; i < count; i++) {
      const q = Math.ceil(quarterStart.month / 3);
      options.push({
        value: quarterStart.toFormat("yyyy-MM-dd"),
        label: `Q${q} ${quarterStart.year}`,
      });
      quarterStart = quarterStart.minus({ quarters: 1 });
    }
  } else {
    // annually
    let yearStart = now.startOf("year");
    for (let i = 0; i < count; i++) {
      options.push({
        value: yearStart.toFormat("yyyy-MM-dd"),
        label: `${yearStart.year}`,
      });
      yearStart = yearStart.minus({ years: 1 });
    }
  }

  return options;
}
