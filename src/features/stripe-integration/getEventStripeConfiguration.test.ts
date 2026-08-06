import { describe, it, expect, beforeEach } from "vitest";
import { getEventStripeConfiguration } from "./getEventStripeConfiguration";

// Table-aware fake: from(table).select().eq().single() resolves tableData[table].
const tableData: Record<string, unknown> = {};

const supabase = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: tableData[table] ?? null }),
      }),
    }),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

function seed(over: { event?: object; office?: object; connection?: object } = {}) {
  tableData.Events = { sales_office_uuid: "office-1", ...over.event };
  tableData.SalesOffices = { stripe_connection_uuid: "conn-1", ...over.office };
  tableData.StripeConnections = {
    id: "conn-1",
    stripe_account_id: "acct_1",
    deleted_at: null,
    charges_enabled: true,
    ...over.connection,
  };
}

describe("getEventStripeConfiguration", () => {
  beforeEach(() => {
    tableData.Events = undefined;
    tableData.SalesOffices = undefined;
    tableData.StripeConnections = undefined;
  });

  it("resolves the connected account for a fully configured event", async () => {
    seed();
    const result = await getEventStripeConfiguration(supabase, "evt-1");
    expect(result).toEqual({
      ok: true,
      config: { stripeAccountId: "acct_1", connectionId: "conn-1" },
    });
  });

  it("404s when the event does not exist", async () => {
    const result = await getEventStripeConfiguration(supabase, "evt-missing");
    expect(result).toEqual({ ok: false, status: 404, error: "Event not found." });
  });

  it("422s when the event has no sales office", async () => {
    seed({ event: { sales_office_uuid: null } });
    const result = await getEventStripeConfiguration(supabase, "evt-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.error).toMatch(/no sales office/i);
    }
  });

  it("422s when the sales office does not exist", async () => {
    seed();
    tableData.SalesOffices = null;
    const result = await getEventStripeConfiguration(supabase, "evt-1");
    expect(result).toMatchObject({ ok: false, status: 422 });
  });

  it("422s when the office has no Stripe connection", async () => {
    seed({ office: { stripe_connection_uuid: null } });
    const result = await getEventStripeConfiguration(supabase, "evt-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no Stripe account connected/i);
  });

  it("422s when the connection no longer exists", async () => {
    seed();
    tableData.StripeConnections = null;
    const result = await getEventStripeConfiguration(supabase, "evt-1");
    expect(result).toMatchObject({ ok: false, status: 422 });
  });

  it("422s when the connection is soft-deleted", async () => {
    seed({ connection: { deleted_at: "2026-07-22T00:00:00Z" } });
    const result = await getEventStripeConfiguration(supabase, "evt-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/removed/i);
  });

  it("422s when the account can't take charges yet", async () => {
    seed({ connection: { charges_enabled: false } });
    const result = await getEventStripeConfiguration(supabase, "evt-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/ready/i);
  });

  it("422s when the account has no id", async () => {
    seed({ connection: { stripe_account_id: null } });
    const result = await getEventStripeConfiguration(supabase, "evt-1");
    expect(result).toMatchObject({ ok: false, status: 422 });
  });
});
