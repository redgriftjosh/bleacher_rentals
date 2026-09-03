import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockConstructEvent,
  mockRetrieve,
  mockPiUpdate,
  mockInsert,
  mockEmailLogInsert,
  mockUpdateEq,
  mockMaybeSingle,
  mockSelectRows,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockRetrieve: vi.fn(),
  mockPiUpdate: vi.fn(),
  // Only tracks PaymentHistory inserts — the subject of the idempotency test.
  mockInsert: vi.fn(),
  // Automatic-email log rows (EventEmailLog) go here so they don't pollute the
  // PaymentHistory insert count.
  mockEmailLogInsert: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockMaybeSingle: vi.fn(),
  // Rows served to the reconciler, per table.
  mockSelectRows: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: mockConstructEvent };
    paymentIntents = { retrieve: mockRetrieve, update: mockPiUpdate };
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => ({
      // Three shapes share this chain: the idempotency check ends in
      // .maybeSingle(), the reconciler awaits .eq() directly, and the currency
      // lookup (event -> office -> QBO connection) ends in .single().
      select: () => {
        const rows = () => (mockSelectRows(table) ?? []) as Record<string, unknown>[];
        const first = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
        const chain: any = Object.assign(Promise.resolve({ data: rows(), error: null }), {
          maybeSingle: table === "PaymentHistory" ? mockMaybeSingle : first,
          single: first,
          eq: () => chain,
        });
        return { eq: () => chain };
      },
      // Route inserts by table so the automatic-email log rows don't inflate the
      // PaymentHistory insert count that the idempotency test asserts on.
      insert: table === "PaymentHistory" ? mockInsert : mockEmailLogInsert,
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, id: string) => mockUpdateEq(column, id, values),
      }),
    }),
  }),
}));

import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(rawBody: string, opts: { signature?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.signature !== undefined) headers["stripe-signature"] = opts.signature;
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body: rawBody,
    headers,
  });
}

/** Builds a checkout.session.completed event; override session/top-level bits. */
function checkoutEvent(over: { session?: object; account?: string; type?: string } = {}) {
  return {
    type: over.type ?? "checkout.session.completed",
    id: "evt_1",
    account: over.account,
    data: {
      object: {
        id: "cs_1",
        payment_intent: "pi_1",
        amount_total: 15000,
        currency: "usd",
        customer_email: null,
        customer_details: { email: "jane@test.com" },
        payment_method_types: ["card"],
        metadata: {
          eventId: "evt-1",
          installmentId: "",
          payerName: "Jane",
          stripeConnectionId: "conn-1",
        },
        ...over.session,
      },
    },
  };
}

/**
 * Serves one installment and one payment row to the reconciler, plus the
 * event -> office -> QuickBooks chain the currency lookup walks.
 */
function serveSchedule(installment: object, payment: object, officeCurrency = "USD") {
  mockSelectRows.mockImplementation((table: string) =>
    table === "Events"
      ? [{ sales_office_uuid: "office-1" }]
      : table === "SalesOffices"
        ? [{ quickbook_uuid: "qbo-1", address_uuid: "addr-1" }]
        : table === "QboConnections"
          ? [{ currency: officeCurrency }]
          : table === "Addresses"
            ? [{ state_province: "Florida" }]
            : table === "PaymentInstallments"
              ? [
                  {
                    id: "inst-9",
                    due_date: "2026-08-31",
                    amount_cents: 15000,
                    currency: "USD",
                    status: "unpaid",
                    paid_at: null,
                    ...installment,
                  },
                ]
              : [
                  {
                    id: "ph-1",
                    installment_id: null,
                    amount_cents: 15000,
                    currency: "USD",
                    status: "succeeded",
                    paid_at: "2026-08-31T19:02:05.114+00:00",
                    created_at: "2026-08-31T19:02:05.198+00:00",
                    ...payment,
                  },
                ],
  );
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockPiUpdate.mockResolvedValue({});
    mockMaybeSingle.mockResolvedValue({ data: null }); // no prior PaymentHistory row
    mockSelectRows.mockReturnValue([]); // no schedule, no payment rows by default
    mockRetrieve.mockResolvedValue({
      latest_charge: { receipt_url: "https://receipt.stripe.com/r1" },
    });
  });

  it("returns 400 when the signature header is missing", async () => {
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Missing signature");
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const res = await POST(makeRequest("{}", { signature: "sig_bad" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid signature");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("ignores event types other than checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent({ type: "payment_intent.created" }));
    const res = await POST(makeRequest("{}", { signature: "sig" }));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 when the session has no eventId in metadata", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent({ session: { metadata: {} } }));
    const res = await POST(makeRequest("{}", { signature: "sig" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No eventId in metadata");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("records a platform-account payment (no Stripe-Account context on retrieve)", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent());
    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);

    // PaymentIntent retrieved WITHOUT a connected-account option.
    expect(mockRetrieve).toHaveBeenCalledOnce();
    const [piId, params, options] = mockRetrieve.mock.calls[0];
    expect(piId).toBe("pi_1");
    expect(params).toEqual({ expand: ["latest_charge"] });
    expect(options).toBeUndefined();

    // Receipt emailed to the address the customer entered on Checkout.
    expect(mockPiUpdate).toHaveBeenCalledWith(
      "pi_1",
      { receipt_email: "jane@test.com" },
      undefined,
    );

    const insert = mockInsert.mock.calls[0][0];
    expect(insert.event_uuid).toBe("evt-1");
    expect(insert.amount_cents).toBe(15000);
    expect(insert.currency).toBe("USD");
    expect(insert.status).toBe("succeeded");
    expect(insert.payer_name).toBe("Jane");
    expect(insert.payer_email).toBe("jane@test.com");
    expect(insert.stripe_receipt_url).toBe("https://receipt.stripe.com/r1");
    expect(insert.stripe_checkout_session_id).toBe("cs_1");
    // Traceability: which connected account processed the payment.
    expect(insert.stripe_connection_uuid).toBe("conn-1");
  });

  it("does not double-insert when the same session is delivered twice", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent());
    // A PaymentHistory row for this session already exists (a prior delivery).
    mockMaybeSingle.mockResolvedValue({ data: { id: "ph-existing" } });

    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    // No second row, and the installment isn't re-touched.
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("records a connected-account payment with a Stripe-Account context", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent({ account: "acct_office1" }));
    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(200);
    // The core Connect fix: PI read AND receipt_email update both scoped to the
    // connected account.
    expect(mockRetrieve.mock.calls[0][2]).toEqual({ stripeAccount: "acct_office1" });
    expect(mockPiUpdate.mock.calls[0][2]).toEqual({ stripeAccount: "acct_office1" });
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("records what the client was paying for, separately from the live link", async () => {
    // installment_id can be re-pointed when a schedule is rebuilt;
    // intended_installment_id is the historical fact and never changes.
    mockConstructEvent.mockReturnValue(
      checkoutEvent({ session: { metadata: { eventId: "evt-1", installmentId: "inst-9" } } }),
    );
    await POST(makeRequest("{}", { signature: "sig" }));

    const insert = mockInsert.mock.calls[0][0];
    expect(insert.installment_id).toBe("inst-9");
    expect(insert.intended_installment_id).toBe("inst-9");
  });

  it("skips the receipt email when the customer provided no email", async () => {
    mockConstructEvent.mockReturnValue(
      checkoutEvent({ session: { customer_email: null, customer_details: { email: null } } }),
    );
    await POST(makeRequest("{}", { signature: "sig" }));

    expect(mockPiUpdate).not.toHaveBeenCalled();
    // Still records the payment, just with a null payer email.
    expect(mockInsert.mock.calls[0][0].payer_email).toBeNull();
  });

  it("marks the installment paid when the payment covers it in full", async () => {
    mockConstructEvent.mockReturnValue(
      checkoutEvent({ session: { metadata: { eventId: "evt-1", installmentId: "inst-9" } } }),
    );
    serveSchedule({ amount_cents: 15000 }, { amount_cents: 15000, installment_id: "inst-9" });

    await POST(makeRequest("{}", { signature: "sig" }));

    expect(mockUpdateEq).toHaveBeenCalledWith("id", "inst-9", {
      status: "paid",
      paid_at: "2026-08-31T19:02:05.114+00:00",
    });
  });

  it("does NOT close a whole installment for a partial payment (Bug 1)", async () => {
    // $1.00 against a $2,700.00 installment — the production bug.
    mockConstructEvent.mockReturnValue(
      checkoutEvent({
        session: { amount_total: 100, metadata: { eventId: "evt-1", installmentId: "inst-9" } },
      }),
    );
    serveSchedule({ amount_cents: 270000 }, { amount_cents: 100, installment_id: "inst-9" });

    await POST(makeRequest("{}", { signature: "sig" }));

    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("closes an installment covered by an untargeted payment", async () => {
    // No installmentId in the metadata: today nothing would be updated at all.
    mockConstructEvent.mockReturnValue(checkoutEvent());
    serveSchedule({ amount_cents: 15000 }, { amount_cents: 15000, installment_id: null });

    await POST(makeRequest("{}", { signature: "sig" }));

    expect(mockUpdateEq).toHaveBeenCalledWith(
      "id",
      "inst-9",
      expect.objectContaining({
        status: "paid",
      }),
    );
  });

  it("reconciles in the office's currency, not the one stored on the schedule", async () => {
    // The office sells in CAD and the payment arrived in CAD; the schedule rows
    // still carry a stale "USD". Reading the currency off those rows would
    // discard a real payment as foreign and leave the installment unpaid.
    mockConstructEvent.mockReturnValue(
      checkoutEvent({ session: { currency: "cad", metadata: { eventId: "evt-1" } } }),
    );
    serveSchedule(
      { amount_cents: 15000, currency: "USD" },
      { amount_cents: 15000, installment_id: null, currency: "CAD" },
      "CAD",
    );

    await POST(makeRequest("{}", { signature: "sig" }));

    expect(mockUpdateEq).toHaveBeenCalledWith(
      "id",
      "inst-9",
      expect.objectContaining({ status: "paid" }),
    );
  });

  it("does not touch installments when the event has no schedule", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent());
    await POST(makeRequest("{}", { signature: "sig" }));
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("still returns 200 when reconciliation fails", async () => {
    // The money is recorded; Stripe must not retry over a cache-refresh failure.
    mockConstructEvent.mockReturnValue(checkoutEvent());
    serveSchedule({ amount_cents: 15000 }, { amount_cents: 15000, installment_id: null });
    mockUpdateEq.mockResolvedValue({ error: { message: "permission denied" } });

    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("acknowledges with 200 when the insert races into a unique violation (23505)", async () => {
    // Two identical deliveries both passed the existence check; this one lost
    // the insert race and hit the partial unique index.
    mockConstructEvent.mockReturnValue(checkoutEvent());
    mockInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    // The winning delivery handles the installment; the loser must not re-touch it.
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("returns 500 on a non-duplicate insert error so Stripe retries", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent());
    mockInsert.mockResolvedValue({ error: { code: "08006", message: "connection failure" } });

    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(500);
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("records the payment even when the receipt fetch fails", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent());
    mockRetrieve.mockRejectedValue(new Error("no such payment_intent"));
    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsert.mock.calls[0][0].stripe_receipt_url).toBeNull();
  });

  it("skips the receipt fetch when there is no payment_intent", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent({ session: { payment_intent: null } }));
    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(200);
    expect(mockRetrieve).not.toHaveBeenCalled();
    expect(mockInsert.mock.calls[0][0].stripe_receipt_url).toBeNull();
    expect(mockInsert.mock.calls[0][0].stripe_payment_intent_id).toBeNull();
  });
});
