/**
 * Works out how much of an event's money has actually arrived, and where it sits.
 *
 * `PaymentHistory` is the source of truth: it holds the amounts that really
 * moved. `PaymentInstallments.status` is only a cache of the answer this
 * function gives — reading that flag to decide how much was paid is what let a
 * $1.00 payment close a $3,600.00 installment in production.
 *
 * Pure and deterministic: no clock, no I/O, no mutation of the caller's arrays.
 * Both UIs and the Stripe webhook run this same function, so they cannot
 * disagree. See docs/specs/payment-accounting-truth.md.
 */

export type AllocatablePayment = {
  id: string;
  installmentId: string | null;
  amountCents: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

export type AllocatableInstallment = {
  id: string;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
};

export type InstallmentAllocation = {
  installmentId: string;
  dueDate: string;
  amountCents: number;
  allocatedCents: number;
  status: "unpaid" | "partial" | "paid";
  /** Timestamp of the payment that completed it. Never set unless fully paid. */
  paidAt: string | null;
};

/** Where one payment's money actually went, after allocation. */
export type PaymentAllocation = {
  paymentId: string;
  parts: { installmentId: string; cents: number }[];
  unallocatedCents: number;
  /** Why the payment was not counted at all, if it wasn't. */
  excluded: null | "currency" | "status";
};

export type Allocation = {
  installments: InstallmentAllocation[];
  byPayment: PaymentAllocation[];
  totalReceivedCents: number;
  allocatedCents: number;
  /** Money received beyond what the schedule can absorb. Counted, never lost. */
  unallocatedCents: number;
  foreignCurrencyPayments: { paymentId: string; currency: string; amountCents: number }[];
};

const COUNTED_STATUS = "succeeded";

/**
 * Timestamps reach us in two shapes: PostgREST returns
 * `2026-08-13T19:00:40.247+00:00`, the PowerSync local DB returns
 * `2026-08-13 19:00:40.247+00`. Compared as strings those two sort wrongly
 * against each other, so everything goes through epoch milliseconds.
 */
export function toEpochMs(value: string | null): number | null {
  if (!value) return null;
  const iso = value
    .trim()
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Sort key for a payment: when the money arrived, as far as we can tell. */
function effectiveMs(p: AllocatablePayment): number {
  return toEpochMs(p.paidAt) ?? toEpochMs(p.createdAt) ?? Number.POSITIVE_INFINITY;
}

/** Ordering comparison, not subtraction — an unparseable timestamp is Infinity. */
function compare(a: number | string, b: number | string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function comparePayments(a: AllocatablePayment, b: AllocatablePayment): number {
  return (
    compare(effectiveMs(a), effectiveMs(b)) ||
    compare(
      toEpochMs(a.createdAt) ?? Number.POSITIVE_INFINITY,
      toEpochMs(b.createdAt) ?? Number.POSITIVE_INFINITY,
    ) ||
    compare(a.id, b.id)
  );
}

function compareInstallments(a: AllocatableInstallment, b: AllocatableInstallment): number {
  return compare(a.dueDate, b.dueDate) || compare(a.id, b.id);
}

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

export function allocatePayments(
  installments: readonly AllocatableInstallment[],
  payments: readonly AllocatablePayment[],
  eventCurrency: string,
): Allocation {
  const wantedCurrency = normalizeCurrency(eventCurrency);

  // Working state, in FIFO order. `toSorted` — the caller's arrays come from
  // memoized hooks; sorting in place would corrupt shared state.
  const ordered = installments.toSorted(compareInstallments);
  const remaining = ordered.map((i) => Math.max(0, i.amountCents));
  const allocated = ordered.map(() => 0);
  const completedBy: (string | null)[] = ordered.map(() => null);
  const indexById = new Map(ordered.map((i, idx) => [i.id, idx]));

  const byPayment = new Map<string, PaymentAllocation>();
  const foreignCurrencyPayments: Allocation["foreignCurrencyPayments"] = [];

  // Split before allocating: a payment in another currency or a non-succeeded
  // one is reported, but never touches a balance. Converting CAD into a USD
  // total without a rate would be a silent FX error that looks correct.
  const counted: AllocatablePayment[] = [];
  for (const p of payments.toSorted(comparePayments)) {
    const excluded: PaymentAllocation["excluded"] =
      p.status !== COUNTED_STATUS
        ? "status"
        : normalizeCurrency(p.currency) !== wantedCurrency
          ? "currency"
          : null;

    byPayment.set(p.id, { paymentId: p.id, parts: [], unallocatedCents: 0, excluded });

    if (excluded === "currency") {
      foreignCurrencyPayments.push({
        paymentId: p.id,
        currency: normalizeCurrency(p.currency),
        amountCents: p.amountCents,
      });
    }
    if (excluded === null) counted.push(p);
  }

  /** Move money onto one installment, recording it on both sides. */
  const apply = (paymentIndex: number, cents: number, payment: AllocatablePayment) => {
    if (cents <= 0) return;
    allocated[paymentIndex] += cents;
    remaining[paymentIndex] -= cents;
    byPayment.get(payment.id)!.parts.push({ installmentId: ordered[paymentIndex].id, cents });
    if (remaining[paymentIndex] === 0) {
      completedBy[paymentIndex] = payment.paidAt ?? payment.createdAt;
    }
  };

  // Pass 1 — targeted payments. What the client aimed at wins over due-date
  // order; anything above that installment's balance spills into pass 2.
  const leftover = new Map<string, number>();
  for (const p of counted) {
    let money = Math.max(0, p.amountCents);
    const idx = p.installmentId ? indexById.get(p.installmentId) : undefined;
    if (idx !== undefined) {
      const take = Math.min(money, remaining[idx]);
      apply(idx, take, p);
      money -= take;
    }
    leftover.set(p.id, money);
  }

  // Pass 2 — everything else, oldest money first, filling installments FIFO.
  let cursor = 0;
  for (const p of counted) {
    let money = leftover.get(p.id) ?? 0;
    while (money > 0 && cursor < ordered.length) {
      if (remaining[cursor] === 0) {
        cursor++;
        continue;
      }
      const take = Math.min(money, remaining[cursor]);
      apply(cursor, take, p);
      money -= take;
    }
    if (money > 0) byPayment.get(p.id)!.unallocatedCents = money;
  }

  const resultInstallments: InstallmentAllocation[] = ordered.map((i, idx) => {
    const nominal = Math.max(0, i.amountCents);
    const covered = allocated[idx];
    const status: InstallmentAllocation["status"] =
      covered >= nominal ? "paid" : covered > 0 ? "partial" : "unpaid";
    return {
      installmentId: i.id,
      dueDate: i.dueDate,
      amountCents: nominal,
      allocatedCents: covered,
      status,
      // Only a real payment leaves a timestamp; a $0 installment is trivially
      // "paid" but nothing paid it.
      paidAt: status === "paid" ? completedBy[idx] : null,
    };
  });

  const allocatedCents = allocated.reduce((sum, cents) => sum + cents, 0);
  const unallocatedCents = counted.reduce(
    (sum, p) => sum + (byPayment.get(p.id)?.unallocatedCents ?? 0),
    0,
  );

  return {
    installments: resultInstallments,
    byPayment: [...byPayment.values()],
    totalReceivedCents: allocatedCents + unallocatedCents,
    allocatedCents,
    unallocatedCents,
    foreignCurrencyPayments,
  };
}
