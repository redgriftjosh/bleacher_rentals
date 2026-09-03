import { describe, it, expect } from "vitest";
import { reconcileEventInstallments, type ReconcileClient } from "./reconcileInstallments";

type InstallmentRow = {
  id: string;
  due_date: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
};

type PaymentRow = {
  id: string;
  installment_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type Update = { id: string; values: Record<string, unknown> };

/**
 * Minimal stand-in for the service-role Supabase client: serves two tables and
 * records the updates the reconciler decides to make.
 */
function fakeClient(
  installments: InstallmentRow[],
  payments: PaymentRow[],
  failures: { read?: string; write?: string } = {},
) {
  const updates: Update[] = [];

  const client: ReconcileClient = {
    from(table: string) {
      return {
        select: () => ({
          eq: () =>
            Promise.resolve(
              failures.read
                ? { data: null, error: { message: failures.read } }
                : { data: table === "PaymentInstallments" ? installments : payments, error: null },
            ),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => {
            updates.push({ id, values });
            return Promise.resolve({
              error: failures.write ? { message: failures.write } : null,
            });
          },
        }),
      };
    },
  } as ReconcileClient;

  return { client, updates };
}

const installment = (over: Partial<InstallmentRow> = {}): InstallmentRow => ({
  id: "i1",
  due_date: "2026-08-31",
  amount_cents: 270000,
  currency: "USD",
  status: "unpaid",
  paid_at: null,
  ...over,
});

const payment = (over: Partial<PaymentRow> = {}): PaymentRow => ({
  id: "p1",
  installment_id: null,
  amount_cents: 270000,
  currency: "USD",
  status: "succeeded",
  paid_at: "2026-08-31T19:02:05.114+00:00",
  created_at: "2026-08-31T19:02:05.198+00:00",
  ...over,
});

describe("reconcileEventInstallments", () => {
  it("leaves an installment unpaid when the payment only covers part of it (Bug 1)", async () => {
    const { client, updates } = fakeClient(
      [installment()],
      [payment({ amount_cents: 100, installment_id: "i1" })],
    );

    const result = await reconcileEventInstallments(client, "evt-1");

    expect(updates).toEqual([]); // already unpaid — nothing to write
    expect(result).toMatchObject({ checked: 1, updated: 0 });
  });

  it("un-pays an installment that a partial payment had wrongly closed", async () => {
    // The production state: $1.00 marked a $2700.00 installment paid.
    const { client, updates } = fakeClient(
      [installment({ status: "paid", paid_at: "2026-08-31T19:02:05.256+00:00" })],
      [payment({ amount_cents: 100, installment_id: "i1" })],
    );

    await reconcileEventInstallments(client, "evt-1");

    expect(updates).toEqual([{ id: "i1", values: { status: "unpaid", paid_at: null } }]);
  });

  it("marks an installment paid when the payment covers it in full", async () => {
    const { client, updates } = fakeClient([installment()], [payment({ installment_id: "i1" })]);

    await reconcileEventInstallments(client, "evt-1");

    expect(updates).toEqual([
      { id: "i1", values: { status: "paid", paid_at: "2026-08-31T19:02:05.114+00:00" } },
    ]);
  });

  it("marks an installment paid from an untargeted payment (FIFO)", async () => {
    // No installmentId in the Stripe metadata — today this updates nothing.
    const { client, updates } = fakeClient([installment()], [payment({ installment_id: null })]);

    await reconcileEventInstallments(client, "evt-1");

    expect(updates).toHaveLength(1);
    expect(updates[0].values.status).toBe("paid");
  });

  it("writes nothing when the stored state already agrees (redelivery)", async () => {
    const { client, updates } = fakeClient(
      [installment({ status: "paid", paid_at: "2026-08-31T19:02:05.114+00:00" })],
      [payment({ installment_id: "i1" })],
    );

    const result = await reconcileEventInstallments(client, "evt-1");

    expect(updates).toEqual([]);
    expect(result.updated).toBe(0);
  });

  it("does not rewrite a paid_at that differs only in timestamp format", async () => {
    // PowerSync writes "… 19:02:05.114+00", PostgREST returns the ISO form.
    // Comparing as strings would rewrite the row on every single webhook.
    const { client, updates } = fakeClient(
      [installment({ status: "paid", paid_at: "2026-08-31 19:02:05.114+00" })],
      [payment({ installment_id: "i1" })],
    );

    await reconcileEventInstallments(client, "evt-1");

    expect(updates).toEqual([]);
  });

  it("splits a large payment across installments and pays only what it covers", async () => {
    const { client, updates } = fakeClient(
      [
        installment({ id: "i1", due_date: "2026-08-31", amount_cents: 100000 }),
        installment({ id: "i2", due_date: "2026-09-16", amount_cents: 100000 }),
      ],
      [payment({ amount_cents: 150000, installment_id: "i1" })],
    );

    await reconcileEventInstallments(client, "evt-1");

    expect(updates).toEqual([
      { id: "i1", values: { status: "paid", paid_at: "2026-08-31T19:02:05.114+00:00" } },
    ]);
  });

  it("ignores a payment in a different currency than the schedule", async () => {
    const { client, updates } = fakeClient(
      [installment({ currency: "USD" })],
      [payment({ currency: "CAD", installment_id: "i1" })],
    );

    await reconcileEventInstallments(client, "evt-1");

    expect(updates).toEqual([]);
  });

  it("uses the event currency it is given over the one stored on the schedule", async () => {
    // The office sells in CAD; the schedule rows still carry a stale "USD" from
    // an older quote. The payment is CAD and must count.
    const { client, updates } = fakeClient(
      [installment({ currency: "USD" })],
      [payment({ currency: "CAD", installment_id: "i1" })],
    );

    await reconcileEventInstallments(client, "evt-1", "CAD");

    expect(updates).toEqual([
      { id: "i1", values: { status: "paid", paid_at: "2026-08-31T19:02:05.114+00:00" } },
    ]);
  });

  it("still falls back to the schedule's own currency when none is given", async () => {
    const { client, updates } = fakeClient(
      [installment({ currency: "CAD" })],
      [payment({ currency: "CAD", installment_id: "i1" })],
    );

    await reconcileEventInstallments(client, "evt-1");

    expect(updates).toHaveLength(1);
  });

  it("does nothing when the event has no schedule", async () => {
    const { client, updates } = fakeClient([], [payment()]);

    const result = await reconcileEventInstallments(client, "evt-1");

    expect(updates).toEqual([]);
    expect(result).toMatchObject({ checked: 0, updated: 0 });
  });

  it("throws when a read fails, so the caller can log it", async () => {
    const { client } = fakeClient([installment()], [payment()], { read: "connection lost" });

    await expect(reconcileEventInstallments(client, "evt-1")).rejects.toThrow(/connection lost/);
  });

  it("throws when a write fails", async () => {
    const { client } = fakeClient([installment()], [payment({ installment_id: "i1" })], {
      write: "permission denied",
    });

    await expect(reconcileEventInstallments(client, "evt-1")).rejects.toThrow(/permission denied/);
  });
});
