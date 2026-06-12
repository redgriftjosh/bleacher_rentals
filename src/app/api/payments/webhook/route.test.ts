import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConstructEvent, mockInsert, mockUpdate, mockUpdateEq } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: mockConstructEvent };
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "PaymentHistory") {
        return {
          insert: (data: any) => {
            mockInsert(data);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === "PaymentInstallments") {
        return {
          update: (data: any) => {
            mockUpdate(data);
            return {
              eq: (col: string, val: string) => {
                mockUpdateEq(col, val);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      return { insert: vi.fn(), update: vi.fn() };
    },
  }),
}));

import { POST } from "./route";
import { NextRequest } from "next/server";

function makeWebhookRequest(body: string, signature: string | null = "sig_test") {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature) headers["stripe-signature"] = signature;
  return new NextRequest("http://localhost:3000/api/payments/webhook", {
    method: "POST",
    body,
    headers,
  });
}

const fakeSession = {
  id: "cs_test_123",
  amount_total: 15000,
  currency: "usd",
  payment_intent: "pi_abc",
  payment_method_types: ["card"],
  customer_email: "jane@test.com",
  metadata: {
    eventId: "evt-1",
    installmentId: "inst-1",
    payerName: "Jane Doe",
  },
};

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeWebhookRequest("{}", null));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing signature");
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeWebhookRequest("{}", "bad_sig"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid signature");
  });

  it("inserts PaymentHistory on checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: fakeSession },
    });

    const res = await POST(makeWebhookRequest("{}"));
    expect(res.status).toBe(200);

    expect(mockInsert).toHaveBeenCalledOnce();
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.event_uuid).toBe("evt-1");
    expect(inserted.installment_id).toBe("inst-1");
    expect(inserted.amount_cents).toBe(15000);
    expect(inserted.currency).toBe("USD");
    expect(inserted.status).toBe("succeeded");
    expect(inserted.stripe_payment_intent_id).toBe("pi_abc");
    expect(inserted.stripe_checkout_session_id).toBe("cs_test_123");
    expect(inserted.payer_name).toBe("Jane Doe");
    expect(inserted.payer_email).toBe("jane@test.com");
    expect(inserted.payment_method_type).toBe("card");
  });

  it("marks installment as paid when installmentId is present", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: fakeSession },
    });

    await POST(makeWebhookRequest("{}"));

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updateData = mockUpdate.mock.calls[0][0];
    expect(updateData.status).toBe("paid");
    expect(updateData.paid_at).toBeDefined();

    expect(mockUpdateEq).toHaveBeenCalledWith("id", "inst-1");
  });

  it("skips installment update when installmentId is empty", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          ...fakeSession,
          metadata: { eventId: "evt-1", installmentId: "", payerName: "Bob" },
        },
      },
    });

    await POST(makeWebhookRequest("{}"));

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when eventId is missing from metadata", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: { ...fakeSession, metadata: { payerName: "Bob" } },
      },
    });

    const res = await POST(makeWebhookRequest("{}"));
    expect(res.status).toBe(400);
  });

  it("ignores non-checkout events", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: {} },
    });

    const res = await POST(makeWebhookRequest("{}"));
    expect(res.status).toBe(200);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
