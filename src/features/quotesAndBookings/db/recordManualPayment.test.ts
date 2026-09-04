import { describe, it, expect, vi, beforeEach } from "vitest";

// The module writes through the PowerSync-backed Kysely instance. What is under
// test is the row it builds — the shape RLS and the CHECK constraints will
// judge — so the executor is captured rather than run.
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/lib/powersync/typedQuery", () => ({
  typedExecute: (compiled: unknown) => execute(compiled),
}));

vi.mock("@/components/providers/SystemProvider", async () => {
  const { Kysely, SqliteDialect } = await import("kysely");
  // A dialect that is never connected: `.compile()` needs a query builder, not
  // a database.
  return {
    db: new Kysely<any>({ dialect: new SqliteDialect({ database: {} as any }) }),
  };
});

import { recordManualPayment } from "./recordManualPayment";

/** The values the compiled INSERT would send, keyed by column. */
function writtenRow() {
  expect(execute).toHaveBeenCalledTimes(1);
  const compiled = execute.mock.calls[0][0] as { sql: string; parameters: readonly unknown[] };
  const columns = [...compiled.sql.matchAll(/"([a-z_]+)"/g)]
    .map((m) => m[1])
    .filter((c) => c !== "PaymentHistory");
  return Object.fromEntries(columns.map((c, i) => [c, compiled.parameters[i]]));
}

const base = {
  eventId: "event-1",
  installmentId: null,
  amountCents: 270000,
  currency: "USD" as const,
  method: "check" as const,
  payerName: "Riverside High",
  reference: "1041",
  notes: null,
  paidAt: "2026-08-14T00:00:00.000Z",
  recordedByUserUuid: "user-9",
};

describe("recordManualPayment", () => {
  beforeEach(() => {
    execute.mockReset();
  });

  it("writes one row into PaymentHistory", async () => {
    await recordManualPayment(base);
    const compiled = execute.mock.calls[0][0] as { sql: string };
    expect(compiled.sql).toMatch(/insert into "PaymentHistory"/i);
  });

  it("records the payment as succeeded and manual", async () => {
    await recordManualPayment(base);
    const row = writtenRow();
    expect(row.status).toBe("succeeded");
    expect(row.entry_source).toBe("manual");
  });

  it("carries a client-generated id, so a retried upload is an upsert not a second payment", async () => {
    await recordManualPayment(base);
    const row = writtenRow();
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("never claims to be a Stripe payment", async () => {
    await recordManualPayment(base);
    const row = writtenRow();
    expect(row.stripe_checkout_session_id ?? null).toBeNull();
    expect(row.stripe_payment_intent_id ?? null).toBeNull();
  });

  it("writes the entered fields through unchanged", async () => {
    await recordManualPayment({ ...base, notes: "NSF, returned" });
    const row = writtenRow();
    expect(row).toMatchObject({
      event_uuid: "event-1",
      amount_cents: 270000,
      currency: "USD",
      payment_method_type: "check",
      payer_name: "Riverside High",
      reference: "1041",
      notes: "NSF, returned",
      paid_at: "2026-08-14T00:00:00.000Z",
      recorded_by_user_uuid: "user-9",
    });
  });

  it("writes a negative amount unchanged — the refund path", async () => {
    await recordManualPayment({ ...base, amountCents: -270000 });
    expect(writtenRow().amount_cents).toBe(-270000);
  });

  it("sets both installment columns from one choice (§4.3)", async () => {
    await recordManualPayment({ ...base, installmentId: "inst-2" });
    const row = writtenRow();
    expect(row.installment_id).toBe("inst-2");
    expect(row.intended_installment_id).toBe("inst-2");
  });

  it("leaves both installment columns null when unapplied", async () => {
    await recordManualPayment({ ...base, installmentId: null });
    const row = writtenRow();
    expect(row.installment_id).toBeNull();
    expect(row.intended_installment_id).toBeNull();
  });

  it("refuses a zero amount before it can reach the database", async () => {
    await expect(recordManualPayment({ ...base, amountCents: 0 })).rejects.toThrow(/zero/i);
    expect(execute).not.toHaveBeenCalled();
  });

  it("refuses an amount beyond the cap", async () => {
    await expect(recordManualPayment({ ...base, amountCents: 100_000_001 })).rejects.toThrow(
      /too large/i,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("refuses a row with nobody to attribute it to", async () => {
    await expect(recordManualPayment({ ...base, recordedByUserUuid: "" })).rejects.toThrow(
      /who recorded/i,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("surfaces a failed local write to the caller", async () => {
    execute.mockRejectedValueOnce(new Error("disk is full"));
    await expect(recordManualPayment(base)).rejects.toThrow(/disk is full/);
  });
});
