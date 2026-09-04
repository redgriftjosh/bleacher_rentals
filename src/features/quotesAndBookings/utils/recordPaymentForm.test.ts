import { describe, it, expect } from "vitest";
import {
  evaluateRecordPaymentForm,
  emptyDraft,
  type RecordPaymentDraft,
} from "./recordPaymentForm";

const TODAY = "2026-08-14";

const draft = (over: Partial<RecordPaymentDraft> = {}): RecordPaymentDraft => ({
  ...emptyDraft({ payerName: "Riverside High", today: TODAY }),
  ...over,
});

const evaluate = (over: Partial<RecordPaymentDraft> = {}) =>
  evaluateRecordPaymentForm(draft(over), TODAY, { currencyResolved: true });

describe("evaluateRecordPaymentForm", () => {
  it("starts unsubmittable, and does not scold anyone for not having typed yet", () => {
    const state = evaluate();
    expect(state.canSubmit).toBe(false);
    expect(state.amountError).toBeNull();
  });

  it("defaults to unapplied — money is not attached to an installment by accident", () => {
    expect(draft().installmentId).toBeNull();
  });

  it("defaults the date to today", () => {
    expect(draft().paidAtDate).toBe(TODAY);
  });

  describe("S6: zero", () => {
    it("is rejected inline", () => {
      expect(evaluate({ amountRaw: "0" }).amountError).toMatch(/cannot be zero/i);
    });

    it("blocks submission", () => {
      expect(evaluate({ amountRaw: "0.00" }).canSubmit).toBe(false);
    });
  });

  describe("S7: a negative amount", () => {
    const negative = evaluate({ amountRaw: "-50" });

    it("is accepted", () => {
      expect(negative.amountCents).toBe(-5000);
      expect(negative.amountError).toBeNull();
      expect(negative.canSubmit).toBe(true);
    });

    it("is flagged as money going out", () => {
      expect(negative.isNegative).toBe(true);
    });

    it("changes the submit label", () => {
      expect(negative.submitLabel).toBe("Record Refund / Adjustment");
    });

    it("reads as a plain payment when positive", () => {
      expect(evaluate({ amountRaw: "50" }).submitLabel).toBe("Record Payment");
      expect(evaluate({ amountRaw: "50" }).isNegative).toBe(false);
    });

    it("accepts accounting's parentheses too", () => {
      const parens = evaluate({ amountRaw: "($12.00)" });
      expect(parens.amountCents).toBe(-1200);
      expect(parens.isNegative).toBe(true);
    });
  });

  describe("the typo guard", () => {
    it("rejects an amount beyond the cap", () => {
      expect(evaluate({ amountRaw: "9999999" }).amountError).toMatch(/1,000,000/);
    });

    it("explains gibberish rather than going quiet", () => {
      expect(evaluate({ amountRaw: "abc" }).amountError).toMatch(/amount/i);
    });
  });

  describe("E4: the date", () => {
    it("refuses tomorrow — a payment received tomorrow is not received", () => {
      const state = evaluate({ amountRaw: "50", paidAtDate: "2026-08-15" });
      expect(state.dateError).toMatch(/future/i);
      expect(state.canSubmit).toBe(false);
    });

    it("allows today", () => {
      expect(evaluate({ amountRaw: "50", paidAtDate: TODAY }).dateError).toBeNull();
    });

    it("allows the past", () => {
      expect(evaluate({ amountRaw: "50", paidAtDate: "2025-01-01" }).dateError).toBeNull();
    });

    it("requires a date at all", () => {
      expect(evaluate({ amountRaw: "50", paidAtDate: "" }).canSubmit).toBe(false);
    });
  });

  describe("payer", () => {
    it("is required", () => {
      const state = evaluate({ amountRaw: "50", payerName: "   " });
      expect(state.payerError).toMatch(/who/i);
      expect(state.canSubmit).toBe(false);
    });

    it("is prefilled from the quote's contact", () => {
      expect(draft().payerName).toBe("Riverside High");
    });
  });

  describe("the Reference label follows the payment type", () => {
    it.each([
      ["check", "Check #"],
      ["ach", "ACH trace"],
      ["manual_credit_card", "Auth code"],
    ] as const)("%s → %s", (method, label) => {
      expect(evaluate({ method }).referenceLabel).toBe(label);
    });
  });

  describe("E6: a submission already in flight", () => {
    it("cannot be sent twice", () => {
      const state = evaluateRecordPaymentForm(draft({ amountRaw: "50" }), TODAY, {
        currencyResolved: true,
        isSubmitting: true,
      });
      expect(state.canSubmit).toBe(false);
    });
  });

  it("is pure — evaluating twice changes nothing", () => {
    const d = draft({ amountRaw: "-1,234.56" });
    const opts = { currencyResolved: true };
    expect(evaluateRecordPaymentForm(d, TODAY, opts)).toEqual(
      evaluateRecordPaymentForm(d, TODAY, opts),
    );
  });

  // E5 / §3.5: the event's currency is not a preference, it is a correctness
  // rule. A row written in the wrong one is excluded from every total and
  // raises a banner blaming the person who entered it — and the ledger is
  // append-only, so there is no taking it back. Until the office currency has
  // actually resolved, this form does not know what it would be writing.
  describe("E5: a currency that has not resolved yet", () => {
    const unresolved = (over: Partial<RecordPaymentDraft> = {}) =>
      evaluateRecordPaymentForm(draft(over), TODAY, { currencyResolved: false });

    it("blocks submission of an otherwise complete form", () => {
      expect(evaluate({ amountRaw: "50" }).canSubmit).toBe(true);
      expect(unresolved({ amountRaw: "50" }).canSubmit).toBe(false);
    });

    it("says why, rather than leaving a dead button", () => {
      expect(unresolved({ amountRaw: "50" }).currencyError).toMatch(/currency/i);
    });

    it("blocks a refund just the same — a negative row in the wrong currency is worse", () => {
      expect(unresolved({ amountRaw: "-50" }).canSubmit).toBe(false);
    });

    it("says nothing once the currency is known", () => {
      expect(evaluate({ amountRaw: "50" }).currencyError).toBeNull();
    });
  });
});
