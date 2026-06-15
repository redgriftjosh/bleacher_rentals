import { db } from "@/components/providers/SystemProvider";
import { typedExecute, typedGetAll, expect } from "@/lib/powersync/typedQuery";
import { PaymentInstallment } from "../types/quoteTypes";
import { Currency } from "../types/quoteTypes";

/**
 * Sync payment installments for an event via PowerSync.
 *
 * Strategy: delete all existing installments for the event, then insert the new set.
 */
export async function syncPaymentInstallments(
  eventUuid: string,
  installments: PaymentInstallment[],
  currency: Currency,
): Promise<void> {
  // 1. Delete existing installments for this event
  await typedExecute(
    db.deleteFrom("PaymentInstallments").where("event_uuid", "=", eventUuid).compile(),
  );

  // 2. Insert new installments
  for (const inst of installments) {
    await typedExecute(
      db
        .insertInto("PaymentInstallments")
        .values({
          id: inst.id,
          event_uuid: eventUuid,
          due_date: inst.dueDate || null,
          amount_cents: inst.amountCents,
          currency: currency,
          status: inst.status,
          paid_at: null,
          created_at: new Date().toISOString(),
        })
        .compile(),
    );
  }
}

type InstallmentRow = {
  id: string;
  due_date: string | null;
  amount_cents: number | null;
  status: string | null;
};

/**
 * Fetch payment installments for an event (one-time, non-reactive read).
 */
export async function fetchPaymentInstallments(
  eventUuid: string,
): Promise<PaymentInstallment[]> {
  const compiled = db
    .selectFrom("PaymentInstallments")
    .select(["id", "due_date", "amount_cents", "status"])
    .where("event_uuid", "=", eventUuid)
    .orderBy("due_date", "asc")
    .compile();

  const rows = await typedGetAll(compiled, expect<InstallmentRow>());

  return rows.map((r) => ({
    id: r.id,
    dueDate: r.due_date ?? "",
    amountCents: r.amount_cents ?? 0,
    status: (r.status as "unpaid" | "paid") ?? "unpaid",
  }));
}
