import { PaymentInstallment } from "../types/quoteTypes";

/** Today's date as YYYY-MM-DD (UTC, matching how installment dates are stored). */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** Add (or subtract) whole days to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Builds the default payment schedule for a quote:
 *   - 50% due on signing (defaults to `today`, since the real signing date
 *     isn't known in advance — the manager can change it).
 *   - remaining 50% due 7 days before `eventStart`.
 *
 * Edge cases:
 *   - If the event is less than 7 days out (or in the past), the second
 *     installment is clamped to `today` so it never falls before signing.
 *   - If `eventStart` is not set yet, the second installment also defaults
 *     to `today`.
 *
 * The two halves always sum exactly to `totalCents` (odd remainder goes to
 * the second installment), so the schedule is balanced by construction.
 *
 * This is only a default — the manager can edit every value afterwards.
 */
export function buildDefaultPaymentSchedule(
  totalCents: number,
  eventStart: string | null | undefined,
  today: string = todayISO(),
  idFn: () => string = () => crypto.randomUUID(),
): PaymentInstallment[] {
  const firstHalf = Math.floor(totalCents / 2);
  const secondHalf = totalCents - firstHalf; // keeps the sum exact

  let secondDate = today;
  if (eventStart) {
    const sevenDaysBefore = addDaysISO(eventStart, -7);
    secondDate = sevenDaysBefore < today ? today : sevenDaysBefore;
  }

  return [
    { id: idFn(), dueDate: today, amountCents: firstHalf, status: "unpaid" },
    { id: idFn(), dueDate: secondDate, amountCents: secondHalf, status: "unpaid" },
  ];
}
