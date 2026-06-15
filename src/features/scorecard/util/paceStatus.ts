/**
 * Pace-vs-actual status thresholds.
 *
 * green  — current >= pace
 * yellow — current >= 80% of pace (but below pace)
 * red    — current < 80% of pace
 */

export type PaceStatus = "green" | "yellow" | "red";

const WARN_THRESHOLD = 0.8;

export function getPaceStatus(current: number, paceTarget: number): PaceStatus {
  if (paceTarget <= 0) return "green";
  if (current >= paceTarget) return "green";
  if (current >= paceTarget * WARN_THRESHOLD) return "yellow";
  return "red";
}

/** Tailwind text colour class for each status. */
export const PACE_TEXT_COLOR: Record<PaceStatus, string> = {
  green: "text-green-600",
  yellow: "text-amber-500",
  red: "text-red-600",
};

/** Hex colour for charts / SVG strokes. */
export const PACE_HEX: Record<PaceStatus, string> = {
  green: "#16A34A",
  yellow: "#F59E0B",
  red: "#DC2626",
};

/** Ring background (light fill behind progress arc). */
export const PACE_RING_BG: Record<PaceStatus, string> = {
  green: "#dcfce7",
  yellow: "#fef3c7",
  red: "#fee2e2",
};
