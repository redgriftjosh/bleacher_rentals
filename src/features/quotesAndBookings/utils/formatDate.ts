import { DateTime } from "luxon";

/**
 * Dates as the Billing tab and its dialogs show them.
 *
 * Shared rather than copied because a payment's date has to read identically in
 * the history table and in the "Apply To" list the user picked it from — two
 * spellings of the same day is the kind of difference that gets reported as a
 * data bug.
 */

export function formatDate(d: string | null): string {
  if (!d) return "—";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MMM d, yyyy") : "—";
}

export function formatDateTime(d: string | null): string {
  if (!d) return "—";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MMM d, yyyy 'at' h:mm a") : "—";
}
