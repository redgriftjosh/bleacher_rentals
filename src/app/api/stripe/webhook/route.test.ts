import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConstructEvent, mockRecord } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockRecord: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: mockConstructEvent };
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({}),
}));

vi.mock("@/app/api/payments/_lib/recordPaymentHistory", () => ({
  recordPaymentHistoryFromCheckoutSession: mockRecord,
}));

import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body,
    headers,
  });
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when the Stripe-Signature header is missing", async () => {
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const res = await POST(makeRequest("{}", { "stripe-signature": "sig_bad" }));
    expect(res.status).toBe(400);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("delegates checkout.session.completed to the record helper and returns received", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_1",
      data: { object: { id: "cs_1" } },
    });
    mockRecord.mockResolvedValue({ ok: true });

    const res = await POST(makeRequest("{}", { "stripe-signature": "sig_ok" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(mockRecord).toHaveBeenCalledOnce();
  });

  it("propagates a non-2xx status when the record helper fails (so Stripe retries)", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_1",
      data: { object: { id: "cs_1" } },
    });
    mockRecord.mockResolvedValue({ ok: false, status: 500, error: "db down" });

    const res = await POST(makeRequest("{}", { "stripe-signature": "sig_ok" }));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("db down");
  });

  it("ignores unrelated event types with a 200 receipt", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.created",
      id: "evt_2",
      data: { object: {} },
    });

    const res = await POST(makeRequest("{}", { "stripe-signature": "sig_ok" }));

    expect(res.status).toBe(200);
    expect(mockRecord).not.toHaveBeenCalled();
  });
});
