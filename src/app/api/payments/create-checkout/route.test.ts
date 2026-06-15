import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCheckoutCreate, mockSupabaseSelect, mockSingle } = vi.hoisted(() => ({
  mockCheckoutCreate: vi.fn(),
  mockSupabaseSelect: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: mockCheckoutCreate } };
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: (...args: any[]) => {
        mockSupabaseSelect(...args);
        return {
          eq: () => ({
            single: mockSingle,
          }),
        };
      },
    }),
  }),
}));

import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/payments/create-checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/payments/create-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when eventId is missing", async () => {
    const res = await POST(makeRequest({ amountCents: 5000, payerName: "John" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required fields");
  });

  it("returns 400 when amountCents is missing", async () => {
    const res = await POST(makeRequest({ eventId: "evt-1", payerName: "John" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when payerName is missing", async () => {
    const res = await POST(makeRequest({ eventId: "evt-1", amountCents: 5000 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when event not found", async () => {
    mockSingle.mockResolvedValue({ data: null });
    const res = await POST(
      makeRequest({ eventId: "evt-missing", amountCents: 5000, payerName: "John" }),
    );
    expect(res.status).toBe(404);
  });

  it("creates Stripe checkout session and returns URL", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "evt-1", event_name: "Game Day", invoice_number: 12345 },
    });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_123" });

    const res = await POST(
      makeRequest({
        eventId: "evt-1",
        amountCents: 15000,
        currency: "USD",
        payerName: "Jane Doe",
        payerEmail: "jane@test.com",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/session_123");

    expect(mockCheckoutCreate).toHaveBeenCalledOnce();
    const sessionArgs = mockCheckoutCreate.mock.calls[0][0];
    expect(sessionArgs.payment_method_types).toEqual(["card"]);
    expect(sessionArgs.mode).toBe("payment");
    expect(sessionArgs.customer_email).toBe("jane@test.com");
    expect(sessionArgs.line_items[0].price_data.unit_amount).toBe(15000);
    expect(sessionArgs.line_items[0].price_data.currency).toBe("usd");
    expect(sessionArgs.metadata.eventId).toBe("evt-1");
    expect(sessionArgs.metadata.payerName).toBe("Jane Doe");
  });

  it("uses CAD currency when specified", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "evt-1", event_name: "Hockey", invoice_number: 99 },
    });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });

    await POST(
      makeRequest({
        eventId: "evt-1",
        amountCents: 10000,
        currency: "CAD",
        payerName: "Bob",
      }),
    );

    const sessionArgs = mockCheckoutCreate.mock.calls[0][0];
    expect(sessionArgs.line_items[0].price_data.currency).toBe("cad");
  });

  it("defaults to USD when currency not specified", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "evt-1", event_name: "Game", invoice_number: null },
    });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });

    await POST(
      makeRequest({ eventId: "evt-1", amountCents: 5000, payerName: "Bob" }),
    );

    const sessionArgs = mockCheckoutCreate.mock.calls[0][0];
    expect(sessionArgs.line_items[0].price_data.currency).toBe("usd");
  });

  it("falls back to eventId in success_url when invoice_number is null", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "evt-uuid-123", event_name: "Game", invoice_number: null },
    });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });

    await POST(
      makeRequest({ eventId: "evt-uuid-123", amountCents: 5000, payerName: "Bob" }),
    );

    const sessionArgs = mockCheckoutCreate.mock.calls[0][0];
    expect(sessionArgs.success_url).toContain("evt-uuid-123");
    expect(sessionArgs.cancel_url).toContain("evt-uuid-123");
  });
});
