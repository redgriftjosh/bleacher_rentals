import { ScorecardStatRow } from "../hooks/queries/useScorecardStats";

type StatField = "driver_pay_cents" | "revenue_cents" | "quotes_signed_value_cents";
type CountField = "quotes_sent" | "quotes_signed_count";

/**
 * Sum a cents-based stat field across all account managers per day,
 * convert to dollars, and return cumulative totals keyed by day.
 */
export function cumulativeCentsByDay(
  days: string[],
  stats: ScorecardStatRow[],
  field: StatField,
): Record<string, number> {
  const daySet = new Set(days);
  const daily: Record<string, number> = {};

  for (const day of days) {
    daily[day] = 0;
  }

  for (const stat of stats) {
    if (!stat.stat_date || !daySet.has(stat.stat_date)) continue;
    daily[stat.stat_date] += (stat[field] ?? 0) / 100;
  }

  const cumulative: Record<string, number> = {};
  let running = 0;
  for (const day of days) {
    running += daily[day];
    cumulative[day] = running;
  }

  return cumulative;
}

/**
 * Sum a count-based stat field across all account managers per day,
 * and return cumulative totals keyed by day.
 */
export function cumulativeCountByDay(
  days: string[],
  stats: ScorecardStatRow[],
  field: CountField,
): Record<string, number> {
  const daySet = new Set(days);
  const daily: Record<string, number> = {};

  for (const day of days) {
    daily[day] = 0;
  }

  for (const stat of stats) {
    if (!stat.stat_date || !daySet.has(stat.stat_date)) continue;
    daily[stat.stat_date] += stat[field] ?? 0;
  }

  const cumulative: Record<string, number> = {};
  let running = 0;
  for (const day of days) {
    running += daily[day];
    cumulative[day] = running;
  }

  return cumulative;
}
