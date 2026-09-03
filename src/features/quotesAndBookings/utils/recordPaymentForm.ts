import {
  MANUAL_PAYMENT_METHODS,
  REFERENCE_LABELS,
  type ManualPaymentMethod,
} from "../types/paymentTypes";
import { parseAmountInput, MAX_PAYMENT_CENTS } from "./parseAmountInput";

/**
 * Everything the Record Payment dialog decides, as a pure function of what has
 * been typed.
 *
 * The dialog itself then only renders this. Which matters because the
 * interesting rules here are not visual — zero is refused, tomorrow is refused,
 * a negative amount changes what the button says and puts a warning on screen —
 * and those are the rules worth testing directly rather than through a DOM.
 *
 * See docs/specs/manual-payment-entry.md §6.2, §6.3, T5.
 */

export type RecordPaymentDraft = {
  method: ManualPaymentMethod;
  amountRaw: string;
  /** YYYY-MM-DD. */
  paidAtDate: string;
  installmentId: string | null;
  payerName: string;
  reference: string;
  notes: string;
};

export type RecordPaymentFormState = {
  /** Signed cents, or null while the amount does not parse. */
  amountCents: number | null;
  isNegative: boolean;
  amountError: string | null;
  dateError: string | null;
  payerError: string | null;
  canSubmit: boolean;
  submitLabel: string;
  referenceLabel: string;
};

export function emptyDraft(params: { payerName: string; today: string }): RecordPaymentDraft {
  return {
    method: MANUAL_PAYMENT_METHODS[2], // Check — the common case in the post
    amountRaw: "",
    paidAtDate: params.today,
    // Unapplied by default. Attaching money to an installment is a decision,
    // and a default would make it by accident.
    installmentId: null,
    payerName: params.payerName,
    reference: "",
    notes: "",
  };
}

const AMOUNT_ERRORS: Record<string, string> = {
  zero: "Amount cannot be zero. To reverse a payment, enter a negative amount.",
  "not-a-number": "Enter an amount, like 1,234.56 or -1,234.56.",
  "too-large": `Amount must be no more than $${(MAX_PAYMENT_CENTS / 100).toLocaleString("en-US")}.`,
};

export function evaluateRecordPaymentForm(
  draft: RecordPaymentDraft,
  today: string,
  options: { isSubmitting?: boolean } = {},
): RecordPaymentFormState {
  const parsed = parseAmountInput(draft.amountRaw);
  const amountCents = parsed.ok ? parsed.cents : null;

  // "empty" is not an error — nobody should be told off for a field they have
  // not reached yet. It just isn't submittable.
  const amountError = parsed.ok || parsed.reason === "empty" ? null : AMOUNT_ERRORS[parsed.reason];

  const dateError = draft.paidAtDate > today ? "A payment cannot be dated in the future." : null;
  const payerError = draft.payerName.trim() === "" ? "Who paid?" : null;

  const isNegative = amountCents !== null && amountCents < 0;

  return {
    amountCents,
    isNegative,
    amountError: amountError ?? null,
    dateError,
    payerError,
    canSubmit:
      !options.isSubmitting &&
      amountCents !== null &&
      draft.paidAtDate !== "" &&
      dateError === null &&
      payerError === null,
    // A refund is not "a payment" and must not read like one on the button the
    // user is about to press.
    submitLabel: isNegative ? "Record Refund / Adjustment" : "Record Payment",
    referenceLabel: REFERENCE_LABELS[draft.method],
  };
}
