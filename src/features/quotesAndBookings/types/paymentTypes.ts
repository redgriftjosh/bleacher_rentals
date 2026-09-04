/**
 * The four kinds of payment this ledger holds.
 *
 * Stripe is a peer of the other three, not a separate system: the Billing tab
 * lists all four together and the totals do not care where a row came from.
 * What it is not is a choice — a Stripe row is written by the webhook and can
 * never be entered by hand, which is why it sits outside `MANUAL_PAYMENT_METHODS`.
 *
 * See docs/specs/manual-payment-entry.md §1, §5.
 */

export const MANUAL_PAYMENT_METHODS = ["manual_credit_card", "ach", "check"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];
export type PaymentMethodType = ManualPaymentMethod | "stripe";

/** Who wrote the row. Never inferred from the method — §3.6. */
export type EntrySource = "stripe" | "manual";

/**
 * What a user sees. The stored value is never printed raw: `manual_credit_card`
 * is a database value, not a label, and it used to reach the screen verbatim.
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  stripe: "Stripe",
  manual_credit_card: "Manual Credit Card",
  ach: "ACH Payment",
  check: "Check",
};

/** The Reference field means something different for each method. */
export const REFERENCE_LABELS: Record<ManualPaymentMethod, string> = {
  manual_credit_card: "Auth code",
  ach: "ACH trace",
  check: "Check #",
};

/**
 * Legacy Stripe rows say "card"; newer ones say "stripe". Anything we do not
 * recognise is shown as-is rather than mislabelled, so an unfamiliar Stripe
 * method type never quietly reads as a hand-entered payment.
 */
export function paymentMethodLabel(methodType: string | null, entrySource: EntrySource): string {
  if (entrySource === "stripe") return PAYMENT_METHOD_LABELS.stripe;
  if (methodType && methodType in PAYMENT_METHOD_LABELS) {
    return PAYMENT_METHOD_LABELS[methodType as PaymentMethodType];
  }
  return methodType ?? "—";
}
