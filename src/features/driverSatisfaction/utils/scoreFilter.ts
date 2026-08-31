/**
 * The score filter: three modes and a threshold the reader picks.
 *
 * Deliberately not a list of every useful band ("6 and below", "5 and below",
 * "5 and above", …) — that dropdown grows to twenty entries and still misses
 * the one somebody wants. Three modes plus a number covers all of them.
 */

import type { SatisfactionRow } from "./aggregate";
import { formatScore } from "./formatScore";

export type ScoreFilterMode = "all" | "at_or_below" | "at_or_above";

export type ScoreFilter = {
  mode: ScoreFilterMode;
  /** The threshold, inclusive. Ignored when the mode is "all". */
  score: number;
};

export const DEFAULT_SCORE_FILTER: ScoreFilter = {
  mode: "all",
  // Pre-set to the follow-up threshold, so switching to "and below" lands
  // straight on the answers that owed a written reason.
  score: 6,
};

/**
 * Both thresholds are inclusive: "6 and below" contains 6.
 *
 * An answer with no score is dropped by either threshold — a text-only answer
 * is not "0 and below" — so it appears under "All" alone.
 */
export function applyScoreFilter(
  rows: readonly SatisfactionRow[],
  filter: ScoreFilter,
): SatisfactionRow[] {
  if (filter.mode === "all") return [...rows];

  return rows.filter((row) => {
    if (row.score === null) return false;
    return filter.mode === "at_or_below" ? row.score <= filter.score : row.score >= filter.score;
  });
}

/** How the current filter reads in prose — for headings and empty states. */
export function describeScoreFilter(filter: ScoreFilter): string {
  if (filter.mode === "all") return "All scores";
  const direction = filter.mode === "at_or_below" ? "below" : "above";
  return `${formatScore(filter.score)} and ${direction}`;
}
