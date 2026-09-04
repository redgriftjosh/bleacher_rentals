"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Currency } from "../../../types/quoteTypes";
import { PaymentHistoryRow } from "../../../hooks/usePaymentHistory";
import type { Allocation } from "../../../utils/allocatePayments";
import { describeAppliedTo, describeOriginalTarget } from "../../../utils/describeAppliedTo";
import { formatMoney } from "../../../utils/formatMoney";
import { formatDate, formatDateTime } from "../../../utils/formatDate";
import {
  REFERENCE_LABELS,
  paymentMethodLabel,
  type ManualPaymentMethod,
} from "../../../types/paymentTypes";

/**
 * Everything the history table had to leave out.
 *
 * The table is a ledger: it has to stay scannable at a glance, so it shows the
 * five things that identify a payment and nothing else. A note can run to a
 * paragraph and a split payment can touch every installment on the schedule —
 * neither fits in a table cell, and squeezing them in is what made the row
 * heights unreadable. They live here instead, one payment at a time.
 *
 * Read-only by design: a payment is corrected with an offsetting row, never by
 * editing this one. See docs/specs/manual-payment-entry.md §3.5.
 */

export type PaymentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentHistoryRow;
  allocation: Allocation;
  currency: Currency;
  /** Who entered it — "Stripe", or the staff name the tab already resolved. */
  recordedBy: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-words">{children}</dd>
    </div>
  );
}

function referenceLabel(payment: PaymentHistoryRow): string {
  const method = payment.paymentMethodType as ManualPaymentMethod | null;
  return (method && REFERENCE_LABELS[method]) || "Reference";
}

export function PaymentDetailDialog({
  open,
  onOpenChange,
  payment,
  allocation,
  currency,
  recordedBy,
}: PaymentDetailDialogProps) {
  const applied = describeAppliedTo(payment, allocation);
  const originalTarget = describeOriginalTarget(payment, allocation);
  const isRefund = payment.amountCents < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-3">
            <span className={isRefund ? "text-red-600" : "text-green-600"}>
              {formatMoney(payment.amountCents, payment.currency as Currency)}
            </span>
            <span className="text-sm font-normal text-gray-500">
              {paymentMethodLabel(payment.paymentMethodType, payment.entrySource)}
            </span>
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(payment.paidAt ?? payment.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Payer">
            {payment.payerName}
            {payment.payerEmail && (
              <span className="block text-xs text-gray-500">{payment.payerEmail}</span>
            )}
          </Field>
          <Field label="Recorded by">{recordedBy}</Field>
          <Field label={referenceLabel(payment)}>
            {payment.reference || <span className="text-gray-400">—</span>}
          </Field>
          <Field label="Status">{payment.status || "—"}</Field>
          <Field label="Recorded on">{formatDateTime(payment.createdAt)}</Field>
          <Field label="Currency">{payment.currency}</Field>
        </dl>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Applied To</h4>
          <div className="mt-2 rounded-md border border-gray-200 divide-y divide-gray-100">
            {applied.kind === "excluded" && (
              <p className="px-3 py-2 text-sm text-amber-700">
                {applied.reason === "currency"
                  ? `Not counted — this payment is in ${payment.currency}, the quote is in ${currency}.`
                  : `Not counted — the payment status is "${payment.status}".`}
              </p>
            )}
            {applied.kind === "unapplied" && (
              <p className="px-3 py-2 text-sm text-gray-500">
                Unapplied — no installment on the current schedule can absorb it.
              </p>
            )}
            {applied.kind === "applied" && (
              <>
                {applied.parts.map((part) => (
                  <div key={part.installmentId} className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-gray-600">Due {formatDate(part.dueDate)}</span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(part.cents, currency)}
                    </span>
                  </div>
                ))}
                {applied.unallocatedCents !== 0 && (
                  <div className="flex justify-between px-3 py-2 text-sm text-gray-500">
                    <span>Unapplied</span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(applied.unallocatedCents, currency)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          {/* The schedule moved under this payment. Allocation follows the live
              link, but what the money was actually paid against is a fact of
              its own and does not get rewritten with the schedule. */}
          {originalTarget && (
            <p className="mt-2 text-xs text-gray-500">
              {originalTarget.stillOnSchedule
                ? `Originally recorded against the installment due ${formatDate(originalTarget.dueDate)}.`
                : "Originally recorded against an installment that is no longer on the schedule."}
            </p>
          )}
        </div>

        {/* The reason this dialog exists: a note is free text and routinely
            longer than any cell. It wraps here, in full, rather than being cut. */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Notes</h4>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap break-words">
            {payment.notes?.trim() || <span className="text-gray-400">No notes.</span>}
          </p>
        </div>

        {payment.receiptUrl && (
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-darkBlue underline w-fit"
          >
            View Stripe receipt
          </a>
        )}

        <p className="text-xs text-gray-400">
          Payments cannot be edited or deleted. To correct one, record a negative amount — both
          entries stay visible.
        </p>
      </DialogContent>
    </Dialog>
  );
}
