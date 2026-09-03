import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The tab is a client component wired to PowerSync, Clerk permissions and
// toasts. Everything except the money logic is stubbed — what is under test is
// what the numbers say.
const { mockInstallments, mockPayments, mockPerms } = vi.hoisted(() => ({
  mockInstallments: vi.fn(),
  mockPayments: vi.fn(),
  mockPerms: vi.fn(),
}));

vi.mock("../../../hooks/usePaymentInstallments", () => ({
  usePaymentInstallments: () => ({ installments: mockInstallments(), isLoading: false }),
}));
vi.mock("../../../hooks/usePaymentHistory", () => ({
  usePaymentHistory: () => ({ payments: mockPayments(), isLoading: false }),
}));
vi.mock("../../../hooks/useEventCurrency", () => ({ useEventCurrency: () => "USD" }));
vi.mock("../../../hooks/useEventIsQbo", () => ({ useEventIsQbo: () => false }));
vi.mock("../../../db/setEventIsQbo", () => ({ setEventIsQbo: vi.fn() }));
vi.mock("@/components/toasts/ErrorToast", () => ({ createErrorToast: vi.fn() }));
vi.mock("@/features/userAccess/state/usePermissionsStore", () => ({
  usePermissionsStore: () => mockPerms(),
}));
vi.mock("../../../hooks/useUserNames", () => ({
  useUserNames: () => new Map([["user-7", "Dana Whitfield"]]),
}));
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => null,
}));

import { BillingTab } from "./BillingTab";
import type { QuoteDetail } from "../../../db/fetchQuoteDetail";

const quote = { id: "evt-1", eventStatus: "booked" } as QuoteDetail;

function installment(over: object = {}) {
  return {
    id: "i1",
    dueDate: "2026-08-31",
    amountCents: 270000,
    currency: "USD",
    ...over,
  };
}

function payment(over: object = {}) {
  return {
    id: "p1",
    installmentId: null,
    amountCents: 200,
    currency: "USD",
    status: "succeeded",
    paymentMethodType: "card",
    payerName: "Krista Timmermans",
    payerEmail: "krista@bleacherrentals.com",
    receiptUrl: "https://pay.stripe.com/receipts/r1",
    paidAt: "2026-08-13T19:00:40.247+00:00",
    createdAt: "2026-08-13T19:00:40.337+00:00",
    intendedInstallmentId: null,
    entrySource: "stripe",
    recordedByUserUuid: null,
    reference: null,
    ...over,
  };
}

function render(contractTotalCents = 500000, canEdit = true) {
  return renderToStaticMarkup(
    <BillingTab quote={quote} contractTotalCents={contractTotalCents} canEdit={canEdit} />,
  );
}

/** The three identities the button distinguishes. */
const ADMIN = { userId: "user-7", isAdmin: true, isAccountManager: false, leadZoneIds: ["z1"] };
const AM = { userId: "user-7", isAdmin: false, isAccountManager: true, leadZoneIds: [] };
const LEAD_AM = { userId: "user-7", isAdmin: false, isAccountManager: true, leadZoneIds: ["z1"] };
const VIEWER = { userId: "user-7", isAdmin: false, isAccountManager: false, leadZoneIds: [] };

describe("BillingTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInstallments.mockReturnValue([]);
    mockPayments.mockReturnValue([]);
    mockPerms.mockReturnValue(ADMIN);
  });

  it("counts a payment made against a quote with no schedule (Bug 2)", () => {
    mockPayments.mockReturnValue([payment({ amountCents: 200 })]);

    const html = render(500000);

    expect(html).toContain("$2.00"); // received
    expect(html).toContain("$4,998.00"); // balance due
    expect(html).not.toContain("No payments recorded yet");
    expect(html).toContain("Krista Timmermans");
  });

  it("shows an installment nobody has paid as unpaid", () => {
    // The schedule row carries no payment state of its own any more — only the
    // term. "Unpaid" here is derived from PaymentHistory having nothing in it.
    // See docs/specs/payment-does-not-invalidate-signature.md §6.
    mockInstallments.mockReturnValue([installment({ amountCents: 270000 })]);
    mockPayments.mockReturnValue([]);

    const html = render(270000);

    expect(html).toContain("Unpaid");
    expect(html).not.toContain("Partial");
    expect(html).toContain("$2,700.00"); // the whole balance is still owed
  });

  it("shows a partial payment as partial, not paid (Bug 1)", () => {
    mockInstallments.mockReturnValue([installment({ amountCents: 270000 })]);
    mockPayments.mockReturnValue([payment({ amountCents: 100, installmentId: "i1" })]);

    const html = render(270000);

    expect(html).toContain("Partial");
    expect(html).not.toContain("Paid</span>");
    expect(html).toContain("$1.00"); // what actually arrived
    expect(html).toContain("$2,699.00"); // balance still owed
  });

  it("shows a fully covered installment as paid", () => {
    mockInstallments.mockReturnValue([installment({ amountCents: 270000 })]);
    mockPayments.mockReturnValue([payment({ amountCents: 270000, installmentId: "i1" })]);

    const html = render(270000);

    expect(html).toContain("Paid");
    expect(html).not.toContain("Partial");
    expect(html).toContain("$0.00"); // balance cleared
  });

  it("reports an overpayment instead of a negative balance", () => {
    mockPayments.mockReturnValue([payment({ amountCents: 600000 })]);

    const html = render(500000);

    expect(html).toContain("Overpaid by");
    expect(html).toContain("$1,000.00");
    expect(html).not.toContain("-$");
  });

  it("names every installment a split payment landed on", () => {
    mockInstallments.mockReturnValue([
      installment({ id: "i1", dueDate: "2026-08-31", amountCents: 100000 }),
      installment({ id: "i2", dueDate: "2026-09-16", amountCents: 100000 }),
    ]);
    mockPayments.mockReturnValue([payment({ amountCents: 150000, installmentId: "i1" })]);

    const html = render(200000);

    expect(html).toContain("Aug 31, 2026");
    expect(html).toContain("Sep 16, 2026");
    expect(html).toContain("$1,000.00");
    expect(html).toContain("$500.00");
  });

  it("marks money that no installment can absorb as unapplied", () => {
    mockInstallments.mockReturnValue([installment({ amountCents: 100000 })]);
    mockPayments.mockReturnValue([payment({ amountCents: 150000 })]);

    const html = render(100000);

    expect(html).toContain("Unapplied");
  });

  it("excludes a foreign-currency payment from the balance and says so", () => {
    mockInstallments.mockReturnValue([installment({ amountCents: 100000 })]);
    mockPayments.mockReturnValue([payment({ amountCents: 100000, currency: "CAD" })]);

    const html = render(100000);

    expect(html).toContain("not included in this balance");
    expect(html).toContain("CAD");
    expect(html).toContain("$1,000.00"); // full balance still due
  });

  // ── Manual payment entry (docs/specs/manual-payment-entry.md §6.1, §6.4) ──

  describe("the + Record Payment button", () => {
    it("is offered to an admin", () => {
      mockPerms.mockReturnValue(ADMIN);
      const html = render(500000, true);
      expect(html).toContain("+ Record Payment");
      expect(html).not.toContain("disabled");
    });

    it("S13: a lead AM may record a payment on a quote they did not create", () => {
      // canEdit is what canEditOwnedEntity already answers for a lead: true on
      // every quote. The tab only has to honour it.
      mockPerms.mockReturnValue(LEAD_AM);
      const html = render(500000, true);
      expect(html).toContain("+ Record Payment");
      expect(html).not.toContain("disabled");
    });

    it("S8: a junior AM on someone else's quote sees it disabled, and why", () => {
      mockPerms.mockReturnValue(AM);
      const html = render(500000, false);
      expect(html).toContain("+ Record Payment");
      expect(html).toContain("disabled");
      expect(html).toContain("only record a payment on quotes you created");
    });

    it("S9: a viewer is not shown it at all", () => {
      mockPerms.mockReturnValue(VIEWER);
      const html = render(500000, false);
      expect(html).not.toContain("+ Record Payment");
      // …but the history is still fully readable.
      expect(html).toContain("Payment History");
    });
  });

  describe("the payment history table", () => {
    it("renders a refund in red with an explicit minus sign", () => {
      mockInstallments.mockReturnValue([installment()]);
      mockPayments.mockReturnValue([
        payment({ id: "a", amountCents: 270000, installmentId: "i1" }),
        payment({ id: "b", amountCents: -270000, installmentId: "i1" }),
      ]);

      const html = render(270000);

      expect(html).toContain("-$2,700.00");
      expect(html).toContain("text-red-600");
    });

    it("S3: the refund reopens the installment it was applied to", () => {
      mockInstallments.mockReturnValue([installment()]);
      mockPayments.mockReturnValue([
        payment({ id: "a", amountCents: 270000, installmentId: "i1" }),
        payment({ id: "b", amountCents: -270000, installmentId: "i1" }),
      ]);

      const html = render(270000);

      expect(html).toContain("Unpaid");
      expect(html).not.toContain("Paid</span>");
    });

    it("S11: labels each row by type rather than printing the stored value", () => {
      mockPayments.mockReturnValue([
        payment({ id: "a", entrySource: "stripe", paymentMethodType: "card" }),
        payment({
          id: "b",
          entrySource: "manual",
          paymentMethodType: "manual_credit_card",
          recordedByUserUuid: "user-7",
        }),
      ]);

      const html = render(500000);

      expect(html).toContain("Stripe");
      expect(html).toContain("Manual Credit Card");
      expect(html).not.toContain("manual_credit_card");
    });

    it("names who recorded a manual row, and Stripe for a webhook row", () => {
      mockPayments.mockReturnValue([
        payment({ id: "a", entrySource: "stripe" }),
        payment({
          id: "b",
          entrySource: "manual",
          paymentMethodType: "check",
          recordedByUserUuid: "user-7",
          reference: "check 1041",
        }),
      ]);

      const html = render(500000);

      expect(html).toContain("Dana Whitfield");
      expect(html).toContain("check 1041");
    });

    it("says corrections are entered as negatives, since nothing can be deleted", () => {
      const html = render();
      expect(html).toContain("record a negative amount");
    });
  });
});
