/**
 * Turning survey answers into the four numbers the page leads with, and the
 * month-by-month line underneath them.
 *
 * Pure and side-effect free: the reads are reactive PowerSync queries, and
 * everything that decides what a number *means* lives here where it can be
 * tested without a database.
 *
 * The bands are not arbitrary. A detractor is 1-6 — precisely the scores the
 * driver app makes a driver explain in writing — so "detractors" and "answers
 * that came with a reason attached" describe the same people. That is what
 * makes the count something to act on rather than decoration.
 */

/** Highest score that still owes a written reason. Mirrors the seeded question. */
export const DETRACTOR_MAX_SCORE = 6;
/** Lowest score counted as a promoter. */
export const PROMOTER_MIN_SCORE = 9;

export type SatisfactionRow = {
  /**
   * `submission_uuid` — the group of answers submitted together, which with a
   * single question is one row. Identity only: nothing here aggregates by it.
   */
  responseId: string;
  driverUuid: string | null;
  driverName: string;
  score: number | null;
  reason: string | null;
  /** `prompt_snapshot` — the wording the driver was actually shown. */
  prompt: string;
  submittedAt: string | null;
  appVersion: string | null;
  appPlatform: string | null;
};

export type SatisfactionSummary = {
  /** Answers in the current filter, scored or not. */
  responseCount: number;
  /** Of those, the ones carrying a number. */
  scoredCount: number;
  /** Distinct drivers behind them. */
  driverCount: number;
  averageScore: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  /** Promoters minus detractors, as a percentage of scored answers. */
  nps: number | null;
  /** Answers that came with something written. */
  withReason: number;
};

const hasText = (value: string | null): boolean => value !== null && value.trim() !== "";

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function summarize(rows: readonly SatisfactionRow[]): SatisfactionSummary {
  const scores: number[] = [];
  const drivers = new Set<string>();
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let withReason = 0;

  for (const row of rows) {
    if (row.driverUuid) drivers.add(row.driverUuid);
    if (hasText(row.reason)) withReason += 1;

    // An unscored answer is a text-only question, not a zero: counting it would
    // pull the average toward a number nobody gave.
    if (row.score === null) continue;

    scores.push(row.score);
    if (row.score >= PROMOTER_MIN_SCORE) promoters += 1;
    else if (row.score > DETRACTOR_MAX_SCORE) passives += 1;
    else detractors += 1;
  }

  const scoredCount = scores.length;
  const averageScore =
    scoredCount === 0 ? null : round1(scores.reduce((sum, score) => sum + score, 0) / scoredCount);

  return {
    responseCount: rows.length,
    scoredCount,
    driverCount: drivers.size,
    averageScore,
    promoters,
    passives,
    detractors,
    nps: scoredCount === 0 ? null : Math.round(((promoters - detractors) / scoredCount) * 100),
    withReason,
  };
}

export type TrendPoint = {
  /** `YYYY-MM`, in the viewer's own timezone. */
  month: string;
  average: number;
  count: number;
};

/**
 * Average score per calendar month, oldest first.
 *
 * Rows with no readable `submitted_at` are skipped rather than bucketed
 * somewhere: a survey answer whose date is unknown belongs to no month, and
 * quietly filing it under "now" would bend the trend the page exists to show.
 */
export function monthlyTrend(rows: readonly SatisfactionRow[]): TrendPoint[] {
  const buckets = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    if (row.score === null || !row.submittedAt) continue;
    const at = new Date(row.submittedAt);
    if (Number.isNaN(at.getTime())) continue;

    const month = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(month);
    if (bucket) {
      bucket.total += row.score;
      bucket.count += 1;
    } else {
      buckets.set(month, { total: row.score, count: 1 });
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, { total, count }]) => ({
      month,
      average: round1(total / count),
      count,
    }));
}
