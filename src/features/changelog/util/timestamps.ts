/**
 * Parse a timestamp that may arrive in either of two shapes:
 *
 *   - Postgres timestamptz synced through PowerSync: "2026-08-10 12:00:00+00"
 *   - Client-written ISO string:                     "2026-08-10T12:00:00.000Z"
 *
 * These must never be compared lexicographically — " " (0x20) sorts below
 * "T" (0x54), so the Postgres shape would always look older regardless of the
 * actual instant. Compare epoch milliseconds instead.
 *
 * Returns null for empty or unparseable input.
 */
export function toEpochMs(value: string | null | undefined): number | null {
  if (!value) return null;

  // Normalise the Postgres space separator, and a bare "+00" offset which
  // Safari and older parsers reject.
  const normalised = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");

  const ms = Date.parse(normalised);
  return Number.isNaN(ms) ? null : ms;
}
