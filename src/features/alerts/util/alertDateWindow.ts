/**
 * Parses a date-only string ("YYYY-MM-DD") as local midnight, avoiding the
 * UTC-parse skew that `new Date("YYYY-MM-DD")` causes in non-UTC timezones.
 */
export function parseDateLocal(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

/**
 * Returns the end boundary of the alert date window starting from today.
 *
 * The window runs from today through a Sunday:
 * - Monday–Wednesday → this week's Sunday (inclusive)
 * - Sunday or Thursday–Saturday → the following week's Sunday (inclusive)
 *
 * Examples (day → window end):
 *   Wed May 6  → Sun May 10
 *   Thu May 7  → Sun May 17
 *   Sun May 11 → Sun May 18
 *
 * @param today - defaults to now; override for testing
 */
export function getAlertWindowEnd(today: Date = new Date()): Date {
  const day = today.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysUntilSunday = (7 - day) % 7; // 0 when today is Sunday

  // Mon–Wed: use this week's Sunday; Sun / Thu–Sat: use next week's Sunday
  const offset = day >= 1 && day <= 3 ? daysUntilSunday : daysUntilSunday + 7;

  const end = new Date(today);
  end.setDate(today.getDate() + offset);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Returns the start of today (midnight local time).
 *
 * @param today - defaults to now; override for testing
 */
export function getAlertWindowStart(today: Date = new Date()): Date {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return start;
}
