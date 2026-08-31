/**
 * Scores are always written as a fraction of ten.
 *
 * A bare "6" on a dashboard is ambiguous — out of what, and is high good? The
 * denominator answers both without a legend, and it stays correct if a future
 * survey ever adds a question on a different scale, because the scale is stated
 * rather than assumed.
 */

/** The only scale the survey uses today. */
export const SCORE_DENOMINATOR = 10;

const EM_DASH = "—";

export function formatScore(score: number | null): string {
  if (score === null) return EM_DASH;
  return `${score}/${SCORE_DENOMINATOR}`;
}

export function formatAverageScore(average: number | null): string {
  if (average === null) return EM_DASH;
  return `${average.toFixed(1)}/${SCORE_DENOMINATOR}`;
}
