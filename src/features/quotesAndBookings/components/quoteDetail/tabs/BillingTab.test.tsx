import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The tab is a client component wired to PowerSync, Clerk permissions and
// toasts. Everything except the money logic is stubbed — what is under test is
// what the numbers say.
const { mockInstallments, mockPayments } = vi.hoisted(() => ({
  mockInstallments: vi.fn(),
  mockPayments: vi.fn(),
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
  usePermissionsStore: () => ({ userId: "user-1" }),
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
    status: "unpaid",
    paidAt: null,
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
    ...over,
  };
}

function render(contractTotalCents = 500000) {
  return renderToStaticMarkup(
    <BillingTab quote={quote} contractTotalCents={contractTotalCents} canEdit={true} />,
  );
}

describe("BillingTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInstallments.mockReturnValue([]);
    mockPayments.mockReturnValue([]);
  });

  it("counts a payment made against a quote with no schedule (Bug 2)", () => {
    mockPayments.mockReturnValue([payment({ amountCents: 200 })]);

    const html = render(500000);

    expect(html).toContain("$2.00"); // received
    expect(html).toContain("$4,998.00"); // balance due
    expect(html).not.toContain("No payments recorded yet");
    expect(html).toContain("Krista Timmermans");
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

  it("declines to answer when payment data has not synced (E8)", () => {
    // Installments say something was paid, but no payment rows arrived — the
    // sync-rule failure mode. Reporting $0.00 received would be a confident lie.
    mockInstallments.mockReturnValue([installment({ status: "paid", paidAt: "2026-08-31" })]);
    mockPayments.mockReturnValue([]);

    const html = render(270000);

    expect(html).toContain("Payment data unavailable");
  });

  it("keeps Record Payment visibly disabled until manual entry exists", () => {
    const html = render();
    expect(html).toContain("Record Payment");
    expect(html).toContain("disabled");
  });
});
