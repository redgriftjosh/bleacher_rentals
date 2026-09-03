"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

/**
 * The payments an event actually received. This — not
 * `PaymentInstallments.status` — is what any money question is answered from.
 * See docs/specs/payment-accounting-truth.md.
 */

type Row = {
  id: string;
  installment_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  payment_method_type: string | null;
  payer_name: string | null;
  payer_email: string | null;
  stripe_receipt_url: string | null;
  paid_at: string | null;
  created_at: string | null;
};

export type PaymentHistoryRow = {
  id: string;
  installmentId: string | null;
  amountCents: number;
  currency: string;
  status: string;
  paymentMethodType: string | null;
  payerName: string;
  payerEmail: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
  createdAt: string;
};

export function usePaymentHistory(eventId: string | null) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("PaymentHistory")
        .select([
          "id",
          "installment_id",
          "amount_cents",
          "currency",
          "status",
          "payment_method_type",
          "payer_name",
          "payer_email",
          "stripe_receipt_url",
          "paid_at",
          "created_at",
        ])
        .where("event_uuid", "=", eventId ?? "")
        .orderBy("created_at", "desc")
        .compile(),
    [eventId],
  );

  const { data, isLoading, error } = useTypedQuery(compiled, expect<Row>());

  // Stable identity: the allocation downstream is memoized on this array.
  const payments = useMemo<PaymentHistoryRow[]>(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        installmentId: r.installment_id,
        amountCents: r.amount_cents ?? 0,
        currency: r.currency ?? "USD",
        status: r.status ?? "",
        paymentMethodType: r.payment_method_type,
        payerName: r.payer_name ?? "Unknown",
        payerEmail: r.payer_email,
        receiptUrl: r.stripe_receipt_url,
        paidAt: r.paid_at,
        createdAt: r.created_at ?? "",
      })),
    [data],
  );

  return { payments, isLoading, error };
}
