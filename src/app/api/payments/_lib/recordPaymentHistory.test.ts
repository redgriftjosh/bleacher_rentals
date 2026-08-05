import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordPaymentHistoryFromCheckoutSession } from "./recordPaymentHistory";

// ── Test doubles ──────────────────────────────────────────────────────────────

function makeSupabase() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const installmentEq = vi.fn().mockResolvedValue({ error: null });
  const installmentUpdate = vi.fn(() => ({ eq: installmentEq }));

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "PaymentInstallments") {
        return { update: installmentUpdate };
      }
      return { insert };
    }),
  };

  return { supabase: supabase as any, insert, installmentUpdate, installmentEq };
}

function makeStripe(receiptUrl: string | null = "https://receipt.test/abc") {
  return {
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({
        latest_charge: { receipt_url: receiptUrl },
      }),
    },
  } as any;
}

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: "cs_test_123",
    amount_total: 15000,
    currency: "usd",
    payment_intent: "pi_test_123",
    payment_method_types: ["card"],
    customer_email: "jane@test.com",
    metadata: { eventId: "evt-1", installmentId: "inst-1", payerName: "Jane Doe" },
    ...overrides,
  } as any;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("recordPaymentHistoryFromCheckoutSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a succeeded PaymentHistory row with fields from the session", async () => {
    const { supabase, insert } = makeSupabase();
    const stripe = makeStripe("https://receipt.test/abc");

    const result = await recordPaymentHistoryFromCheckoutSession(makeSession(), {
      stripe,
      supabase,
    });

    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledOnce();
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({
      event_uuid: "evt-1",
      installment_id: "inst-1",
      amount_cents: 15000,
      currency: "USD",
      status: "succeeded",
      stripe_payment_intent_id: "pi_test_123",
      stripe_checkout_session_id: "cs_test_123",
      stripe_receipt_url: "https://receipt.test/abc",
      payment_method_type: "card",
      payer_name: "Jane Doe",
      payer_email: "jane@test.com",
    });
    expect(row.paid_at).toBeTruthy();
  });

  it("marks the linked installment paid when installmentId is present", async () => {
    const { supabase, installmentUpdate, installmentEq } = makeSupabase();
    await recordPaymentHistoryFromCheckoutSession(makeSession(), {
      stripe: makeStripe(),
      supabase,
    });
    expect(installmentUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "paid" }));
    expect(installmentEq).toHaveBeenCalledWith("id", "inst-1");
  });

  it("does not touch installments when installmentId is absent", async () => {
    const { supabase, installmentUpdate } = makeSupabase();
    await recordPaymentHistoryFromCheckoutSession(
      makeSession({ metadata: { eventId: "evt-1", payerName: "Jane" } }),
      { stripe: makeStripe(), supabase },
    );
    expect(installmentUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 and does not insert when eventId metadata is missing", async () => {
    const { supabase, insert } = makeSupabase();
    const result = await recordPaymentHistoryFromCheckoutSession(
      makeSession({ metadata: { payerName: "Jane" } }),
      { stripe: makeStripe(), supabase },
    );
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
    expect(insert).not.toHaveBeenCalled();
  });

  it("still inserts with null receipt when receipt fetch fails", async () => {
    const { supabase, insert } = makeSupabase();
    const stripe = {
      paymentIntents: { retrieve: vi.fn().mockRejectedValue(new Error("boom")) },
    } as any;

    const result = await recordPaymentHistoryFromCheckoutSession(makeSession(), {
      stripe,
      supabase,
    });

    expect(result.ok).toBe(true);
    expect(insert.mock.calls[0][0].stripe_receipt_url).toBeNull();
  });

  it("treats a unique-violation (duplicate webhook) as a successful no-op", async () => {
    const { supabase, insert } = makeSupabase();
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    const result = await recordPaymentHistoryFromCheckoutSession(makeSession(), {
      stripe: makeStripe(),
      supabase,
    });

    expect(result).toEqual({ ok: true, duplicate: true });
  });

  it("returns 500 on a non-duplicate insert error so Stripe retries", async () => {
    const { supabase, insert } = makeSupabase();
    insert.mockResolvedValue({ error: { code: "XXXXX", message: "db down" } });

    const result = await recordPaymentHistoryFromCheckoutSession(makeSession(), {
      stripe: makeStripe(),
      supabase,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });

  it("still succeeds (history kept) when the installment update fails", async () => {
    const { supabase, installmentEq } = makeSupabase();
    installmentEq.mockResolvedValue({ error: { message: "installment update failed" } });

    const result = await recordPaymentHistoryFromCheckoutSession(makeSession(), {
      stripe: makeStripe(),
      supabase,
    });

    expect(result.ok).toBe(true);
  });
});
