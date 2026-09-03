import {
  allocatePayments,
  toEpochMs,
  type AllocatableInstallment,
  type AllocatablePayment,
} from "../utils/allocatePayments";

/**
 * Brings `PaymentInstallments.status` / `paid_at` back in line with the money
 * actually recorded in `PaymentHistory`.
 *
 * Those two columns are a **cache** of `allocatePayments`, never an independent
 * fact — writing `status = 'paid'` because a payment arrived, without checking
 * the amount, is what let $1.00 close a $3,600.00 installment in production.
 *
 * Idempotent by construction: it recomputes the whole event from scratch and
 * writes only the rows that disagree, so a redelivered webhook is a no-op and a
 * row an earlier delivery got wrong is repaired on the next payment.
 *
 * See docs/specs/payment-accounting-truth.md §3.2.
 */

type QueryError = { message: string } | null;

/**
 * The slice of the Supabase client this needs. Structural, so the untyped
 * service-role client from the webhook satisfies it and tests can pass a fake.
 */
export type ReconcileClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{ data: unknown[] | null; error: QueryError }>;
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: QueryError }>;
    };
  };
};

export type ReconcileResult = { checked: number; updated: number };

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

const INSTALLMENT_COLUMNS = "id, due_date, amount_cents, currency, status, paid_at";
const PAYMENT_COLUMNS = "id, installment_id, amount_cents, currency, status, paid_at, created_at";

/** Same instant written two ways is not a change worth a write. */
function sameTimestamp(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const [ma, mb] = [toEpochMs(a), toEpochMs(b)];
  return ma !== null && ma === mb;
}

export async function reconcileEventInstallments(
  supabase: ReconcileClient,
  eventUuid: string,
  /**
   * The event's currency, resolved from its sales office by the caller. The
   * office is the single source of truth for what a quote is priced in — the
   * same one the Checkout session is charged in. Optional so a caller that
   * cannot resolve it (a failed read) still reconciles on the schedule's own
   * currency rather than not at all.
   */
  eventCurrency?: string,
): Promise<ReconcileResult> {
  // Independent reads — one round trip, not two.
  const [installmentResult, paymentResult] = await Promise.all([
    supabase.from("PaymentInstallments").select(INSTALLMENT_COLUMNS).eq("event_uuid", eventUuid),
    supabase.from("PaymentHistory").select(PAYMENT_COLUMNS).eq("event_uuid", eventUuid),
  ]);

  if (installmentResult.error) {
    throw new Error(`Failed to read installments: ${installmentResult.error.message}`);
  }
  if (paymentResult.error) {
    throw new Error(`Failed to read payment history: ${paymentResult.error.message}`);
  }

  const storedInstallments = (installmentResult.data ?? []) as InstallmentRow[];
  const storedPayments = (paymentResult.data ?? []) as PaymentRow[];

  // Nothing to cache when there is no schedule. The payment is still recorded
  // and still counted everywhere it is read — see the spec's Bug 2.
  if (storedInstallments.length === 0) return { checked: 0, updated: 0 };

  const installments: AllocatableInstallment[] = storedInstallments.map((row) => ({
    id: row.id,
    dueDate: row.due_date ?? "",
    amountCents: row.amount_cents ?? 0,
  }));

  const payments: AllocatablePayment[] = storedPayments.map((row) => ({
    id: row.id,
    installmentId: row.installment_id,
    amountCents: row.amount_cents ?? 0,
    currency: row.currency ?? "",
    status: row.status ?? "",
    paidAt: row.paid_at,
    createdAt: row.created_at ?? "",
  }));

  // The office's currency wins. The installments carry a copy of it, written
  // when the quote was priced, which is only a fallback — Events have no
  // currency column of their own.
  const currency =
    eventCurrency ?? storedInstallments.find((row) => row.currency)?.currency ?? "USD";

  const allocation = allocatePayments(installments, payments, currency);
  const storedById = new Map(storedInstallments.map((row) => [row.id, row]));

  const pending = allocation.installments.flatMap((result) => {
    const stored = storedById.get(result.installmentId);
    if (!stored) return [];

    // `partial` is a display state; the column keeps its two values, and a
    // partially covered installment is simply not paid yet.
    const status = result.status === "paid" ? "paid" : "unpaid";
    const paidAt = result.status === "paid" ? result.paidAt : null;

    if (stored.status === status && sameTimestamp(stored.paid_at, paidAt)) return [];
    return [{ id: result.installmentId, values: { status, paid_at: paidAt } }];
  });

  const results = await Promise.all(
    pending.map((row) => supabase.from("PaymentInstallments").update(row.values).eq("id", row.id)),
  );

  const failure = results.find((r) => r.error);
  if (failure?.error) {
    throw new Error(`Failed to update installment: ${failure.error.message}`);
  }

  return { checked: allocation.installments.length, updated: pending.length };
}
