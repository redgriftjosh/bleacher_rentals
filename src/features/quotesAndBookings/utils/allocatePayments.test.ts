import { describe, it, expect } from "vitest";
import {
  allocatePayments,
  type AllocatableInstallment,
  type AllocatablePayment,
} from "./allocatePayments";

// ── Builders ──────────────────────────────────────────────────────────
// Defaults describe the boring case (a succeeded USD payment, an untargeted
// one), so each test only spells out the part it is actually about.

let seq = 0;
const nextId = () => `p-${++seq}`;

function inst(id: string, dueDate: string, amountCents: number): AllocatableInstallment {
  return { id, dueDate, amountCents };
}

function pay(amountCents: number, over: Partial<AllocatablePayment> = {}): AllocatablePayment {
  const id = over.id ?? nextId();
  return {
    id,
    installmentId: null,
    amountCents,
    currency: "USD",
    status: "succeeded",
    paidAt: "2026-06-01T12:00:00.000+00:00",
    createdAt: "2026-06-01T12:00:00.000+00:00",
    ...over,
  };
}

/** Invariants that must hold for every allocation, whatever the inputs. */
function assertInvariants(result: ReturnType<typeof allocatePayments>) {
  // Conservation: no cent is invented or lost.
  expect(result.allocatedCents + result.unallocatedCents).toBe(result.totalReceivedCents);

  const summed = result.installments.reduce((s, i) => s + i.allocatedCents, 0);
  expect(summed).toBe(result.allocatedCents);

  for (const i of result.installments) {
    expect(i.allocatedCents).toBeGreaterThanOrEqual(0);
    expect(i.allocatedCents).toBeLessThanOrEqual(i.amountCents);
    // The bug this spec exists to remove: a paid_at left behind on a row that
    // is no longer paid.
    if (i.status !== "paid") expect(i.paidAt).toBeNull();
  }

  const perPayment = result.byPayment.reduce(
    (s, p) => s + p.parts.reduce((t, part) => t + part.cents, 0) + p.unallocatedCents,
    0,
  );
  expect(perPayment).toBe(result.totalReceivedCents);
}

// ── Scenarios from the spec (§7) ──────────────────────────────────────

describe("allocatePayments — spec scenarios", () => {
  it("S1: a $1 payment leaves a $2700 installment partial, not paid (Bug 1)", () => {
    const installments = [inst("i1", "2026-08-31", 270000), inst("i2", "2026-09-16", 270000)];
    const result = allocatePayments(installments, [pay(100, { installmentId: "i1" })], "USD");

    expect(result.installments[0]).toMatchObject({
      installmentId: "i1",
      allocatedCents: 100,
      status: "partial",
      paidAt: null,
    });
    expect(result.installments[1].status).toBe("unpaid");
    expect(result.totalReceivedCents).toBe(100);
    assertInvariants(result);
  });

  it("S2: a payment with no schedule is still counted (Bug 2)", () => {
    const result = allocatePayments([], [pay(200)], "USD");

    expect(result.totalReceivedCents).toBe(200);
    expect(result.unallocatedCents).toBe(200);
    expect(result.allocatedCents).toBe(0);
    expect(result.installments).toEqual([]);
    assertInvariants(result);
  });

  it("S3: an exact payment pays its installment and leaves the next alone", () => {
    const installments = [inst("i1", "2026-08-31", 270000), inst("i2", "2026-09-16", 270000)];
    const result = allocatePayments(
      installments,
      [pay(270000, { installmentId: "i1", paidAt: "2026-08-31T19:02:05.114+00:00" })],
      "USD",
    );

    expect(result.installments[0]).toMatchObject({
      status: "paid",
      allocatedCents: 270000,
      paidAt: "2026-08-31T19:02:05.114+00:00",
    });
    expect(result.installments[1].status).toBe("unpaid");
    assertInvariants(result);
  });

  it("S4: an untargeted payment fills installments FIFO by due date", () => {
    const installments = [inst("i1", "2026-08-31", 270000), inst("i2", "2026-09-16", 270000)];
    const result = allocatePayments(installments, [pay(400000)], "USD");

    expect(result.installments[0]).toMatchObject({ status: "paid", allocatedCents: 270000 });
    expect(result.installments[1]).toMatchObject({ status: "partial", allocatedCents: 130000 });
    assertInvariants(result);
  });

  it("S6: an overpayment is counted in full and spills into unallocated", () => {
    const result = allocatePayments([inst("i1", "2026-08-31", 500000)], [pay(600000)], "USD");

    expect(result.totalReceivedCents).toBe(600000);
    expect(result.allocatedCents).toBe(500000);
    expect(result.unallocatedCents).toBe(100000);
    expect(result.installments[0].status).toBe("paid");
    assertInvariants(result);
  });

  it("S7: a payment targeting a deleted installment is re-allocated, not lost", () => {
    const result = allocatePayments(
      [inst("i-new", "2026-10-01", 100000)],
      [pay(60000, { installmentId: "i-deleted" })],
      "USD",
    );

    expect(result.totalReceivedCents).toBe(60000);
    expect(result.installments[0]).toMatchObject({ allocatedCents: 60000, status: "partial" });
    assertInvariants(result);
  });

  it("S8: two payments summing to the nominal pay it, dated by the completing one", () => {
    const result = allocatePayments(
      [inst("i1", "2026-08-31", 100000)],
      [
        pay(40000, { id: "first", paidAt: "2026-08-01T10:00:00.000+00:00" }),
        pay(60000, { id: "second", paidAt: "2026-08-20T10:00:00.000+00:00" }),
      ],
      "USD",
    );

    expect(result.installments[0]).toMatchObject({
      status: "paid",
      allocatedCents: 100000,
      paidAt: "2026-08-20T10:00:00.000+00:00",
    });
    assertInvariants(result);
  });

  it("S9: targeting wins over due-date order, the rest still goes FIFO", () => {
    const installments = [inst("i1", "2026-08-31", 100000), inst("i2", "2026-09-16", 100000)];
    const result = allocatePayments(
      installments,
      [
        pay(100000, {
          id: "targeted",
          installmentId: "i2",
          paidAt: "2026-08-01T10:00:00.000+00:00",
        }),
        pay(60000, { id: "loose", paidAt: "2026-08-02T10:00:00.000+00:00" }),
      ],
      "USD",
    );

    expect(result.installments[0]).toMatchObject({ status: "partial", allocatedCents: 60000 });
    expect(result.installments[1]).toMatchObject({ status: "paid", allocatedCents: 100000 });
    assertInvariants(result);
  });

  it("S10: a targeted payment larger than its installment spills onto the next", () => {
    const installments = [inst("i1", "2026-08-31", 100000), inst("i2", "2026-09-16", 100000)];
    const result = allocatePayments(
      installments,
      [pay(150000, { id: "big", installmentId: "i1" })],
      "USD",
    );

    expect(result.installments[0]).toMatchObject({ status: "paid", allocatedCents: 100000 });
    expect(result.installments[1]).toMatchObject({ status: "partial", allocatedCents: 50000 });

    // The history table needs to say where a split payment actually went.
    expect(result.byPayment).toEqual([
      {
        paymentId: "big",
        parts: [
          { installmentId: "i1", cents: 100000 },
          { installmentId: "i2", cents: 50000 },
        ],
        unallocatedCents: 0,
        excluded: null,
      },
    ]);
    assertInvariants(result);
  });

  it("S11: an installment that grows past its payment loses its paid_at", () => {
    // The row was 'paid' in the DB at $1000; the schedule was edited to $2000.
    const result = allocatePayments(
      [inst("i1", "2026-08-31", 200000)],
      [pay(100000, { installmentId: "i1", paidAt: "2026-08-01T10:00:00.000+00:00" })],
      "USD",
    );

    expect(result.installments[0]).toMatchObject({ status: "partial", paidAt: null });
    assertInvariants(result);
  });

  it("S12: a payment in another currency never touches the balance", () => {
    const result = allocatePayments(
      [inst("i1", "2026-08-31", 100000)],
      [pay(100000, { id: "cad", currency: "CAD" })],
      "USD",
    );

    expect(result.totalReceivedCents).toBe(0);
    expect(result.allocatedCents).toBe(0);
    expect(result.installments[0]).toMatchObject({ status: "unpaid", allocatedCents: 0 });
    expect(result.foreignCurrencyPayments).toEqual([
      { paymentId: "cad", currency: "CAD", amountCents: 100000 },
    ]);
    expect(result.byPayment[0]).toMatchObject({ paymentId: "cad", excluded: "currency" });
    assertInvariants(result);
  });
});

// ── Ordering, formats, purity ─────────────────────────────────────────

describe("allocatePayments — determinism", () => {
  const installments = [
    inst("i2", "2026-09-16", 100000),
    inst("i1", "2026-08-31", 100000),
    inst("i3", "2026-10-01", 100000),
  ];
  const payments = [
    pay(50000, { id: "c", paidAt: "2026-08-03T10:00:00.000+00:00" }),
    pay(120000, { id: "a", paidAt: "2026-08-01T10:00:00.000+00:00" }),
    pay(30000, { id: "b", paidAt: "2026-08-02T10:00:00.000+00:00" }),
  ];

  it("orders installments by due date regardless of input order", () => {
    const result = allocatePayments(installments, payments, "USD");
    expect(result.installments.map((i) => i.installmentId)).toEqual(["i1", "i2", "i3"]);
  });

  it("produces identical output for shuffled inputs", () => {
    const a = allocatePayments(installments, payments, "USD");
    const b = allocatePayments([...installments].reverse(), [...payments].reverse(), "USD");
    expect(b).toEqual(a);
  });

  it("compares PowerSync and PostgREST timestamp formats correctly", () => {
    // Same instants, written the two ways they actually reach us. If these were
    // compared as strings the order would flip.
    const postgrest = allocatePayments(
      [inst("i1", "2026-08-31", 100000)],
      [
        pay(60000, { id: "early", paidAt: "2026-08-01T10:00:00.000+00:00" }),
        pay(40000, { id: "late", paidAt: "2026-08-20T10:00:00.000+00:00" }),
      ],
      "USD",
    );
    const powersync = allocatePayments(
      [inst("i1", "2026-08-31", 100000)],
      [
        pay(60000, { id: "early", paidAt: "2026-08-01 10:00:00.000+00" }),
        pay(40000, { id: "late", paidAt: "2026-08-20 10:00:00.000+00" }),
      ],
      "USD",
    );

    expect(powersync.installments[0].allocatedCents).toBe(postgrest.installments[0].allocatedCents);
    expect(powersync.byPayment.map((p) => p.paymentId)).toEqual(["early", "late"]);
  });

  it("falls back to created_at, then id, and sorts unparseable timestamps last", () => {
    const result = allocatePayments(
      [inst("i1", "2026-08-31", 100000)],
      [
        pay(50000, { id: "broken", paidAt: "not-a-date", createdAt: "also-not-a-date" }),
        pay(50000, { id: "dated", paidAt: null, createdAt: "2026-08-01T10:00:00.000+00:00" }),
      ],
      "USD",
    );

    expect(result.byPayment.map((p) => p.paymentId)).toEqual(["dated", "broken"]);
    assertInvariants(result);
  });

  it("does not mutate its inputs", () => {
    const i = [inst("i2", "2026-09-16", 100000), inst("i1", "2026-08-31", 100000)];
    const p = [
      pay(50000, { id: "z", paidAt: "2026-08-05T10:00:00.000+00:00" }),
      pay(50000, { id: "y", paidAt: "2026-08-01T10:00:00.000+00:00" }),
    ];
    const iCopy = structuredClone(i);
    const pCopy = structuredClone(p);

    allocatePayments(i, p, "USD");

    expect(i).toEqual(iCopy);
    expect(p).toEqual(pCopy);
  });
});

// ── Degenerate and hostile inputs ─────────────────────────────────────

describe("allocatePayments — edge cases", () => {
  it("handles no installments and no payments", () => {
    const result = allocatePayments([], [], "USD");
    expect(result).toMatchObject({
      installments: [],
      byPayment: [],
      totalReceivedCents: 0,
      allocatedCents: 0,
      unallocatedCents: 0,
      foreignCurrencyPayments: [],
    });
  });

  it("ignores pending and failed payments", () => {
    const result = allocatePayments(
      [inst("i1", "2026-08-31", 100000)],
      [
        pay(50000, { id: "ok" }),
        pay(90000, { id: "pending", status: "pending" }),
        pay(90000, { id: "failed", status: "failed" }),
      ],
      "USD",
    );

    expect(result.totalReceivedCents).toBe(50000);
    expect(result.byPayment.find((p) => p.paymentId === "pending")?.excluded).toBe("status");
    expect(result.byPayment.find((p) => p.paymentId === "failed")?.excluded).toBe("status");
    assertInvariants(result);
  });

  it("does not loop or divide on a zero-amount installment", () => {
    const result = allocatePayments(
      [inst("i0", "2026-08-31", 0), inst("i1", "2026-09-16", 100000)],
      [pay(100000)],
      "USD",
    );

    // A $0 installment is trivially covered; nothing paid it, so it carries no
    // timestamp. The money goes to the real installment.
    expect(result.installments[0]).toMatchObject({ allocatedCents: 0, paidAt: null });
    expect(result.installments[1]).toMatchObject({ status: "paid", allocatedCents: 100000 });
    assertInvariants(result);
  });

  it("treats an empty-string installmentId as untargeted", () => {
    // create-checkout sends installmentId: "" when there is no schedule.
    const result = allocatePayments(
      [inst("i1", "2026-08-31", 100000)],
      [pay(50000, { installmentId: "" })],
      "USD",
    );

    expect(result.installments[0].allocatedCents).toBe(50000);
    assertInvariants(result);
  });

  it("compares currency case- and whitespace-insensitively", () => {
    const result = allocatePayments(
      [inst("i1", "2026-08-31", 100000)],
      [pay(50000, { currency: "usd " })],
      "USD",
    );

    expect(result.totalReceivedCents).toBe(50000);
    assertInvariants(result);
  });

  it("counts a zero-amount payment without affecting anything", () => {
    const result = allocatePayments([inst("i1", "2026-08-31", 100000)], [pay(0)], "USD");
    expect(result.totalReceivedCents).toBe(0);
    expect(result.installments[0].status).toBe("unpaid");
    assertInvariants(result);
  });
});
