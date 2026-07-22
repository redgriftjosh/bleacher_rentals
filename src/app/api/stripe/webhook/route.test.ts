import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConstructEvent, mockRetrieve, mockPiUpdate, mockInsert, mockUpdateEq } = vi.hoisted(
  () => ({
    mockConstructEvent: vi.fn(),
    mockRetrieve: vi.fn(),
    mockPiUpdate: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdateEq: vi.fn(),
  }),
);

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: mockConstructEvent };
    paymentIntents = { retrieve: mockRetrieve, update: mockPiUpdate };
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      insert: mockInsert,
      update: () => ({ eq: mockUpdateEq }),
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
        metadata: { eventId: "evt-1", installmentId: "", payerName: "Jane" },
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

  it("skips the receipt email when the customer provided no email", async () => {
    mockConstructEvent.mockReturnValue(
      checkoutEvent({ session: { customer_email: null, customer_details: { email: null } } }),
    );
    await POST(makeRequest("{}", { signature: "sig" }));

    expect(mockPiUpdate).not.toHaveBeenCalled();
    // Still records the payment, just with a null payer email.
    expect(mockInsert.mock.calls[0][0].payer_email).toBeNull();
  });

  it("marks the installment paid when installmentId is present", async () => {
    mockConstructEvent.mockReturnValue(
      checkoutEvent({ session: { metadata: { eventId: "evt-1", installmentId: "inst-9" } } }),
    );
    await POST(makeRequest("{}", { signature: "sig" }));

    expect(mockUpdateEq).toHaveBeenCalledWith("id", "inst-9");
  });

  it("does not touch installments when there is no installmentId", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent());
    await POST(makeRequest("{}", { signature: "sig" }));
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("still returns 200 when the PaymentHistory insert fails", async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent());
    mockInsert.mockResolvedValue({ error: { message: "db down" } });
    const res = await POST(makeRequest("{}", { signature: "sig" }));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
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
