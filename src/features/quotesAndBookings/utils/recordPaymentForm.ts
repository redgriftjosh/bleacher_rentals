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
  /** Set while the event's currency is still unknown — never a user's mistake. */
  currencyError: string | null;
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

/**
 * `currencyResolved` has no default on purpose.
 *
 * A default would be the wrong shape of safety: whichever value it took, a
 * caller that forgot the field would silently get it, and the failure this
 * guards against (§3.5, E5 — a row written in a currency the office had not
 * reported yet, excluded from every total, in an append-only ledger) is exactly
 * the kind nobody notices until reconciliation. Making it required moves that
 * from a runtime accident to a compile error.
 */
export type RecordPaymentFormOptions = {
  /** Whether `useEventCurrency` has a real answer yet, not just its fallback. */
  currencyResolved: boolean;
  isSubmitting?: boolean;
};

export function evaluateRecordPaymentForm(
  draft: RecordPaymentDraft,
  today: string,
  options: RecordPaymentFormOptions,
): RecordPaymentFormState {
  const parsed = parseAmountInput(draft.amountRaw);
  const amountCents = parsed.ok ? parsed.cents : null;

  // "empty" is not an error — nobody should be told off for a field they have
  // not reached yet. It just isn't submittable.
  const amountError = parsed.ok || parsed.reason === "empty" ? null : AMOUNT_ERRORS[parsed.reason];

  const dateError = draft.paidAtDate > today ? "A payment cannot be dated in the future." : null;
  const payerError = draft.payerName.trim() === "" ? "Who paid?" : null;

  const isNegative = amountCents !== null && amountCents < 0;

  // Not phrased as something the user did wrong, because it isn't — they are
  // waiting on the office's currency, and the only thing they can do is wait.
  const currencyError = options.currencyResolved
    ? null
    : "Still loading this quote's currency. A payment has to be recorded in it, so this will enable in a moment.";

  return {
    amountCents,
    isNegative,
    amountError: amountError ?? null,
    dateError,
    payerError,
    currencyError,
    canSubmit:
      !options.isSubmitting &&
      amountCents !== null &&
      draft.paidAtDate !== "" &&
      dateError === null &&
      payerError === null &&
      currencyError === null,
    // A refund is not "a payment" and must not read like one on the button the
    // user is about to press.
    submitLabel: isNegative ? "Record Refund / Adjustment" : "Record Payment",
    referenceLabel: REFERENCE_LABELS[draft.method],
  };
}
