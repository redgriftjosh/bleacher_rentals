import type { WorkTrackerTimeMode } from "../util";

/** A brand-new exact/flexible pickup or dropoff defaults to 8:00 AM. */
const DEFAULT_TIME = "08:00:00";

/** How far apart Flexible's From/To default when first switched on from Exact. */
const DEFAULT_FLEXIBLE_WINDOW_HOURS = 1;

/**
 * Postgres `time` round-trips as "HH:MM:SS" (PowerSync/Kysely) or "HH:MM"
 * (an `<input type="time">` value or a brand-new default) — this normalizes
 * either to "HH:MM:SS" so every stored value has one consistent shape, which
 * matters for plain string comparison/sorting.
 */
export function normalizeWorkTrackerTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const seconds = match[3] ?? "00";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${seconds}`;
}

/** "HH:MM:SS" → "HH:MM", the value an `<input type="time">` expects. */
export function toInputTimeValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

/**
 * Adds `hours`, clamped to the same day (never wraps past midnight) — ranges
 * don't cross days here (see docs/specs), so a default seeded late in the day
 * (e.g. 11:30 PM) lands on 11:59 PM rather than producing an end before its
 * start, which the DB's check constraint would reject anyway.
 */
function addHours(time: string, hours: number): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  const totalMinutes = Math.min(
    Number(match[1]) * 60 + Number(match[2]) + hours * 60,
    23 * 60 + 59,
  );
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export type WorkTrackerTimeFieldState = {
  mode: WorkTrackerTimeMode;
  start: string | null;
  end: string | null;
};

/**
 * The next `{mode, start, end}` when a user switches modes on the toggle.
 * Preserves an existing value across the switch where it makes sense
 * (Exact → Flexible keeps the same start), and seeds a sensible default
 * where there's nothing yet to carry over.
 */
export function switchWorkTrackerTimeMode(
  current: WorkTrackerTimeFieldState,
  nextMode: WorkTrackerTimeMode,
): WorkTrackerTimeFieldState {
  if (nextMode === "any_time") {
    return { mode: "any_time", start: null, end: null };
  }
  if (nextMode === "exact") {
    const start = current.start ?? DEFAULT_TIME;
    return { mode: "exact", start, end: start };
  }
  // flexible
  const start = current.start ?? DEFAULT_TIME;
  const end =
    current.mode === "flexible" && current.end
      ? current.end
      : addHours(start, DEFAULT_FLEXIBLE_WINDOW_HOURS);
  return { mode: "flexible", start, end };
}
