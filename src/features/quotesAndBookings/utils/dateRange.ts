import { DateTime } from "luxon";

export function isWithinRange(
  value: string | null,
  from: string | null,
  to: string | null,
): boolean {
  if (!from && !to) return true;
  if (!value) return false;

  const date = DateTime.fromISO(value);
  if (!date.isValid) return false;

  if (from) {
    const fromDate = DateTime.fromISO(from);
    if (fromDate.isValid && date < fromDate.startOf("day")) return false;
  }

  if (to) {
    const toDate = DateTime.fromISO(to);
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
