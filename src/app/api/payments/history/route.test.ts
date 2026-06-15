import { describe, it, expect, vi, beforeEach } from "vitest";

let orderResult: { data: any; error: any } = { data: [], error: null };

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => orderResult,
        }),
      }),
    }),
  }),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

describe("GET /api/payments/history", () => {
  beforeEach(() => {
    orderResult = { data: [], error: null };
  });

  it("returns 400 when eventId query param is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/payments/history");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing eventId");
  });

  it("returns empty array when no payments exist", async () => {
    orderResult = { data: [], error: null };
    const req = new NextRequest("http://localhost:3000/api/payments/history?eventId=evt-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("returns payment rows", async () => {
    const rows = [
      {
        id: "ph-1",
        amount_cents: 10000,
        currency: "USD",
        status: "succeeded",
        payment_method_type: "card",
        payer_name: "Jane",
        payer_email: "jane@test.com",
        stripe_receipt_url: "https://receipt.stripe.com/r1",
        paid_at: "2026-06-12T10:00:00Z",
        created_at: "2026-06-12T10:00:00Z",
      },
    ];
    orderResult = { data: rows, error: null };

    const req = new NextRequest("http://localhost:3000/api/payments/history?eventId=evt-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("ph-1");
    expect(json[0].amount_cents).toBe(10000);
  });

  it("returns 500 on supabase error", async () => {
    orderResult = { data: null, error: { message: "DB down" } };

    const req = new NextRequest("http://localhost:3000/api/payments/history?eventId=evt-1");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB down");
  });
});
