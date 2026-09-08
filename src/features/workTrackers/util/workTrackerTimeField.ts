import {
  parseAbsolute,
  parseDate,
  toCalendarDateTime,
  toZoned,
  type ZonedDateTime,
} from "@internationalized/date";

/** A brand-new pickup/dropoff time defaults to 8:00 AM rather than midnight. */
const DEFAULT_HOUR = 8;

/**
 * Which zone a pickup/dropoff time field should actually use: the zone
 * already saved with it (so an existing value is never silently
 * reinterpreted just because the address later resolves to a different
 * zone), else the zone the current address implies, else the browser's own
 * zone as a last resort so the field is never simply unusable.
 * See docs/specs (pickup/dropoff timezone).
 */
export function resolveEffectiveTimezone(
  storedTimezone: string | null | undefined,
  addressTimezone: string | null | undefined,
  browserTimezone: string,
): string {
  return storedTimezone ?? addressTimezone ?? browserTimezone;
}

/**
 * Builds the `ZonedDateTime` a time picker should show: the real stored
 * instant if there is one, otherwise a default time on the trip's own date —
 * never today's date.
 *
 * Null when there's no timezone to interpret the time in, or, for a
 * brand-new value, no trip date to default onto.
 */
export function resolveWorkTrackerTimeFieldValue(
  isoValue: string | null | undefined,
  timezone: string | null | undefined,
  date: string | null | undefined,
): ZonedDateTime | null {
  if (!timezone) return null;

  if (isoValue) {
    try {
      return parseAbsolute(isoValue, timezone);
    } catch {
      return null;
    }
  }

  if (!date) return null;
  try {
    return toZoned(parseDate(date), timezone).set({ hour: DEFAULT_HOUR, minute: 0 });
  } catch {
    return null;
  }
}

/** The ISO instant string to save (pickup_at/dropoff_at), from a picker value. */
export function workTrackerTimeFieldValueToIso(value: ZonedDateTime | null): string | null {
  return value ? value.toAbsoluteString() : null;
}

/**
 * True once a real address zone is known (coordinates resolved) and it
 * disagrees with whatever zone the time was actually saved under — e.g. the
 * pickup was set while the address had no coordinates yet (so it fell back
 * to the browser's zone), and the address has since been re-selected and
 * turned out to be somewhere else. Never fires for a brand-new, unset time —
 * there's nothing yet to be wrong.
 */
export function needsTimezoneSync(
  storedTimezone: string | null | undefined,
  addressTimezone: string | null | undefined,
): boolean {
  return Boolean(storedTimezone && addressTimezone && storedTimezone !== addressTimezone);
}

/**
 * Re-anchors a stored time onto the correct zone, keeping the clock reading
 * the same (8:00 stays 8:00) rather than preserving the absolute instant —
 * the person who entered "8:00 AM" meant 8:00 AM at the actual pickup
 * location, not whatever instant 8:00 AM in the wrong zone happened to be.
 */
export function resyncWorkTrackerTimeFieldValue(
  isoValue: string | null | undefined,
  fromTimezone: string,
  toTimezone: string,
): string | null {
  if (!isoValue) return null;
  try {
    const current = parseAbsolute(isoValue, fromTimezone);
    return toZoned(toCalendarDateTime(current), toTimezone).toAbsoluteString();
  } catch {
    return null;
  }
}

/** Default: DST changes coming up within this many days either side count as "near". */
const DEFAULT_DST_WINDOW_DAYS = 14;

/**
 * True when the given zone's UTC offset differs 14 days before vs. 14 days
 * after the trip date — i.e. a daylight-saving transition falls somewhere in
 * that window, so a time someone types without thinking about it could be
 * off by an hour from what they meant. Dates and timezones are confusing
 * enough already; better to ask than to silently get it wrong.
 */
export function isNearDstTransition(
  date: string | null | undefined,
  timezone: string | null | undefined,
  windowDays: number = DEFAULT_DST_WINDOW_DAYS,
): boolean {
  if (!date || !timezone) return false;
  try {
    const base = parseDate(date);
    const before = toZoned(base.subtract({ days: windowDays }), timezone).offset;
    const after = toZoned(base.add({ days: windowDays }), timezone).offset;
    return before !== after;
  } catch {
    return false;
  }
}
