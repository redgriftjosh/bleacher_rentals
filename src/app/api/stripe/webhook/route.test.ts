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
  mockSendTriggerEmail,
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
  // Rows served per table to the selects this route makes.
  mockSelectRows: vi.fn(),
  mockSendTriggerEmail: vi.fn(),
}));

vi.mock("@/features/automaticEmails/server/sendTriggerEmail", () => ({
  sendTriggerEmail: mockSendTriggerEmail,
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
      // The table is recorded too: this route must not write to
      // PaymentInstallments at all, and that is asserted by table name.
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, id: string) => mockUpdateEq(table, column, id, values),
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

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockPiUpdate.mockResolvedValue({});
    mockMaybeSingle.mockResolvedValue({ data: null }); // no prior PaymentHistory row
    mockSelectRows.mockReturnValue([]);
    mockSendTriggerEmail.mockResolvedValue(undefined);
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

  it("marks the row as Stripe's, and keeps the instrument as detail", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent());

    await POST(makeRequest("{}", { signature: "sig" }));

    const insert = mockInsert.mock.calls[0][0];
    // The webhook is the only writer that may claim this — the RLS insert
    // policy refuses entry_source 'stripe' from any client.
    expect(insert.entry_source).toBe("stripe");
    // One of the four types the Billing tab lists, not whatever Stripe called
    // the instrument. That detail is still recorded, just not as the type.
    expect(insert.payment_method_type).toBe("stripe");
    expect(insert.reference).toBe("card");
    expect(insert.recorded_by_user_uuid).toBeUndefined();
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

  it("does not write to PaymentInstallments — the schedule holds terms, not payment state", async () => {
    // The route used to reconcile status/paid_at onto the schedule after every
    // payment. Those columns are gone: paid/due is derived from PaymentHistory
    // wherever it is shown, and writing the schedule made the quote look
    // changed, which invalidated the client's contract signature.
    // See docs/specs/payment-does-not-invalidate-signature.md.
    mockConstructEvent.mockReturnValue(
      checkoutEvent({ session: { metadata: { eventId: "evt-1", installmentId: "inst-9" } } }),
    );
    // A schedule the old reconcile step would have written to: one installment,
    // fully covered by one succeeded payment.
    mockSelectRows.mockImplementation((table: string) =>
      table === "PaymentInstallments"
        ? [{ id: "inst-9", due_date: "2026-08-31", amount_cents: 15000, currency: "USD" }]
        : table === "PaymentHistory"
          ? [
              {
                id: "ph-1",
                installment_id: "inst-9",
                amount_cents: 15000,
                currency: "USD",
                status: "succeeded",
                paid_at: "2026-08-31T19:02:05.114+00:00",
                created_at: "2026-08-31T19:02:05.198+00:00",
              },
            ]
          : [],
    );

    await POST(makeRequest("{}", { signature: "sig" }));

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockUpdateEq).not.toHaveBeenCalledWith(
      "PaymentInstallments",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("still sends both payment-made emails", async () => {
    // Removing the reconcile step must not take the rest of the route with it.
    mockConstructEvent.mockReturnValue(checkoutEvent());

    const res = await POST(makeRequest("{}", { signature: "sig" }));

    expect(res.status).toBe(200);
    expect(mockSendTriggerEmail).toHaveBeenCalledTimes(2);
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
