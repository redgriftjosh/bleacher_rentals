import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCheckoutCreate, tableData } = vi.hoisted(() => ({
  mockCheckoutCreate: vi.fn(),
  tableData: {} as Record<string, unknown>,
}));

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: mockCheckoutCreate } };
  },
}));

// Table-aware mock: from(table).select().eq().single() resolves whatever the
// test put in tableData[table]. Both the route (event display) and the helper
// (event -> office -> connection) read through this.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: tableData[table] ?? null }),
        }),
      }),
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

/** A fully-configured event -> office -> active connection chain. */
function seedHappyPath(over: { event?: object; office?: object; connection?: object } = {}) {
  tableData.Events = {
    id: "evt-1",
    event_name: "Game Day",
    invoice_number: 12345,
    sales_office_uuid: "office-1",
    ...over.event,
  };
  tableData.SalesOffices = { stripe_connection_uuid: "conn-1", ...over.office };
  tableData.StripeConnections = {
    id: "conn-1",
    stripe_account_id: "acct_office1",
    deleted_at: null,
    charges_enabled: true,
    ...over.connection,
  };
}

describe("POST /api/payments/create-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableData.Events = undefined;
    tableData.SalesOffices = undefined;
    tableData.StripeConnections = undefined;
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_123" });
  });

  it("returns 400 when eventId is missing", async () => {
    const res = await POST(makeRequest({ amountCents: 5000, payerName: "John" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Missing required fields");
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
    const res = await POST(
      makeRequest({ eventId: "evt-missing", amountCents: 5000, payerName: "John" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 422 when the event has no sales office", async () => {
    seedHappyPath({ event: { sales_office_uuid: null } });
    const res = await POST(makeRequest({ eventId: "evt-1", amountCents: 5000, payerName: "John" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/no sales office/i);
  });

  it("returns 422 when the office has no Stripe connection", async () => {
    seedHappyPath({ office: { stripe_connection_uuid: null } });
    const res = await POST(makeRequest({ eventId: "evt-1", amountCents: 5000, payerName: "John" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when the connection is soft-deleted", async () => {
    seedHappyPath({ connection: { deleted_at: "2026-07-22T00:00:00Z" } });
    const res = await POST(makeRequest({ eventId: "evt-1", amountCents: 5000, payerName: "John" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/removed/i);
  });

  it("returns 422 when the connection can't take charges yet", async () => {
    seedHappyPath({ connection: { charges_enabled: false } });
    const res = await POST(makeRequest({ eventId: "evt-1", amountCents: 5000, payerName: "John" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/ready/i);
  });

  it("creates the session on the office's connected account and returns URL", async () => {
    seedHappyPath();
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
    expect((await res.json()).url).toBe("https://checkout.stripe.com/session_123");

    expect(mockCheckoutCreate).toHaveBeenCalledOnce();
    const [sessionArgs, requestOpts] = mockCheckoutCreate.mock.calls[0];
    expect(sessionArgs.line_items[0].price_data.unit_amount).toBe(15000);
    expect(sessionArgs.line_items[0].price_data.currency).toBe("usd");
    expect(sessionArgs.metadata.eventId).toBe("evt-1");
    expect(sessionArgs.metadata.payerName).toBe("Jane Doe");
    expect(sessionArgs.metadata.stripeConnectionId).toBe("conn-1");
    // Email is left editable on the Checkout page (not prefilled/locked); the
    // receipt is sent later by the webhook from the entered address.
    expect(sessionArgs.customer_email).toBeUndefined();
    // Routed to the connected account, not the platform account.
    expect(requestOpts).toEqual({ stripeAccount: "acct_office1" });
  });

  it("uses CAD currency when specified", async () => {
    seedHappyPath();
    await POST(
      makeRequest({ eventId: "evt-1", amountCents: 10000, currency: "CAD", payerName: "Bob" }),
    );
    expect(mockCheckoutCreate.mock.calls[0][0].line_items[0].price_data.currency).toBe("cad");
  });

  it("defaults to USD when currency not specified", async () => {
    seedHappyPath({ event: { invoice_number: null } });
    await POST(makeRequest({ eventId: "evt-1", amountCents: 5000, payerName: "Bob" }));
    expect(mockCheckoutCreate.mock.calls[0][0].line_items[0].price_data.currency).toBe("usd");
  });

  it("falls back to eventId in success_url when invoice_number is null", async () => {
    seedHappyPath({ event: { id: "evt-uuid-123", invoice_number: null } });
    await POST(makeRequest({ eventId: "evt-uuid-123", amountCents: 5000, payerName: "Bob" }));
    const sessionArgs = mockCheckoutCreate.mock.calls[0][0];
    expect(sessionArgs.success_url).toContain("/quote/evt-uuid-123");
    expect(sessionArgs.cancel_url).toContain("/quote/evt-uuid-123");
    expect(sessionArgs.success_url).not.toContain("987654321");
  });
});
