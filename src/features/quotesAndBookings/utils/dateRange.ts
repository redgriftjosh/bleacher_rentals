import { DateTime } from "luxon";

/**
 * Check if a date value falls within a from/to range.
 *
 * When a timezone is provided, the value is converted to that timezone before
 * comparison — so "which day does this timestamp fall on?" is answered
 * consistently regardless of the browser's local timezone.
 *
 * This is the single source of truth for date filtering across the app
 * (quotes & bookings page, scorecard, etc.).
 */
export function isWithinRange(
  value: string | null,
  from: string | null,
  to: string | null,
  timezone?: string,
): boolean {
  if (!from && !to) return true;
  if (!value) return false;

  const date = timezone
    ? DateTime.fromISO(value, { zone: timezone })
    : DateTime.fromISO(value);
  if (!date.isValid) return false;

  if (from) {
    const fromDate = timezone
      ? DateTime.fromISO(from, { zone: timezone })
      : DateTime.fromISO(from);
    if (fromDate.isValid && date < fromDate.startOf("day")) return false;
  }

  if (to) {
    const toDate = timezone
      ? DateTime.fromISO(to, { zone: timezone })
      : DateTime.fromISO(to);
    if (toDate.isValid && date > toDate.endOf("day")) return false;
  }

  return true;
}

export function overlapsRange(
  start: string | null,
  end: string | null,
  from: string | null,
  to: string | null,
): boolean {
  if (!from && !to) return true;
  if (!start && !end) return false;

  const startDate = start ? DateTime.fromISO(start) : null;
  const endDate = end ? DateTime.fromISO(end) : null;

  const fromDate = from ? DateTime.fromISO(from).startOf("day") : null;
  const toDate = to ? DateTime.fromISO(to).endOf("day") : null;

  const startValue = startDate?.isValid ? startDate : null;
  const endValue = endDate?.isValid ? endDate : null;

  if (!startValue && !endValue) return false;

  const effectiveStart = startValue ?? endValue;
  const effectiveEnd = endValue ?? startValue;

  if (fromDate && effectiveEnd && effectiveEnd < fromDate) return false;
  if (toDate && effectiveStart && effectiveStart > toDate) return false;

  return true;
}
