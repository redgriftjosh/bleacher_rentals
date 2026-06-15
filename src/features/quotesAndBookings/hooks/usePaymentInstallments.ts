"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

type Row = {
  id: string;
  due_date: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
};

export type PaymentInstallmentRow = {
  id: string;
  dueDate: string;
  amountCents: number;
  currency: string;
  status: "unpaid" | "paid";
  paidAt: string | null;
};

export function usePaymentInstallments(eventId: string | null) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("PaymentInstallments")
        .select(["id", "due_date", "amount_cents", "currency", "status", "paid_at"])
        .where("event_uuid", "=", eventId ?? "")
        .orderBy("due_date", "asc")
        .compile(),
    [eventId],
  );

  const { data, isLoading, error } = useTypedQuery(compiled, expect<Row>());

  const installments = useMemo<PaymentInstallmentRow[]>(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        dueDate: r.due_date ?? "",
        amountCents: r.amount_cents ?? 0,
        currency: r.currency ?? "USD",
        status: (r.status as "unpaid" | "paid") ?? "unpaid",
        paidAt: r.paid_at,
      })),
    [data],
  );

  return { installments, isLoading, error };
}
