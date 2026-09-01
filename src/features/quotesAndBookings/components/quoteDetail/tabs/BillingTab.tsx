"use client";

import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { QuoteDetail } from "../../../db/fetchQuoteDetail";
import { setEventIsQbo } from "../../../db/setEventIsQbo";
import { useEventIsQbo } from "../../../hooks/useEventIsQbo";
import {
  usePaymentInstallments,
  PaymentInstallmentRow,
} from "../../../hooks/usePaymentInstallments";
import { useEventCurrency } from "../../../hooks/useEventCurrency";
import { formatMoney } from "../../../utils/formatMoney";
import { Currency } from "../../../types/quoteTypes";
import { DateTime } from "luxon";

function formatDate(d: string | null): string {
  if (!d) return "—";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MMM d, yyyy") : "—";
}

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MMM d, yyyy 'at' h:mm a") : "—";
}

function PaymentScheduleTable({
  installments,
  currency,
}: {
  installments: PaymentInstallmentRow[];
  currency: Currency;
}) {
  if (installments.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center border rounded">
        No payment schedule set. Edit the quote to add installments.
      </p>
    );
  }

  const totalCents = installments.reduce((sum, i) => sum + i.amountCents, 0);
  const paidCents = installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="py-2 font-medium">#</th>
            <th className="py-2 font-medium">Due Date</th>
            <th className="py-2 font-medium text-right">Amount</th>
            <th className="py-2 font-medium text-center">Status</th>
            <th className="py-2 font-medium">Paid At</th>
          </tr>
        </thead>
        <tbody>
          {installments.map((inst, i) => (
            <tr key={inst.id} className="border-b">
              <td className="py-2 text-gray-400">{i + 1}</td>
              <td className="py-2">{formatDate(inst.dueDate)}</td>
              <td className="py-2 text-right font-medium">
                {formatMoney(inst.amountCents, currency)}
              </td>
              <td className="py-2 text-center">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    inst.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {inst.status === "paid" ? "Paid" : "Unpaid"}
                </span>
              </td>
              <td className="py-2 text-gray-500">
                {inst.paidAt ? formatDateTime(inst.paidAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-col items-end gap-1 text-sm">
        <div className="flex gap-8">
          <span className="text-gray-500">Scheduled Total</span>
          <span className="font-medium w-24 text-right">{formatMoney(totalCents, currency)}</span>
        </div>
        <div className="flex gap-8 text-green-600">
          <span>Paid</span>
          <span className="font-medium w-24 text-right">{formatMoney(paidCents, currency)}</span>
        </div>
        <div className="flex gap-8 border-t pt-1 mt-1">
          <span className="font-semibold">Remaining</span>
          <span className="font-bold w-24 text-right">
            {formatMoney(totalCents - paidCents, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BillingTab({
  quote,
  contractTotalCents,
  canEdit,
}: {
  quote: QuoteDetail;
  contractTotalCents: number;
  canEdit: boolean;
}) {
  const { installments, isLoading } = usePaymentInstallments(quote.id);
  const currency = useEventCurrency(quote.id);
  const storedIsQbo = useEventIsQbo(quote.id);
  const perms = usePermissionsStore();

  // Optimistic value: the write goes to the local DB and only then comes back
  // through the reactive query, which is enough of a round trip to look laggy.
  // We draw the user's own click immediately and drop the override once the DB
  // agrees (or the write fails).
  const [pendingIsQbo, setPendingIsQbo] = useState<boolean | null>(null);
  const isQbo = pendingIsQbo ?? storedIsQbo;

  useEffect(() => {
    if (pendingIsQbo !== null && pendingIsQbo === storedIsQbo) setPendingIsQbo(null);
  }, [pendingIsQbo, storedIsQbo]);

  // Writes are chained so that fast on/off/on clicking cannot land out of order
  // and leave the row disagreeing with the box.
  const qboWriteQueue = useRef<Promise<unknown>>(Promise.resolve());

  const handleQboChange = (checked: boolean) => {
    setPendingIsQbo(checked);
    qboWriteQueue.current = qboWriteQueue.current
      .then(() =>
        setEventIsQbo({
          eventId: quote.id,
          isQbo: checked,
          currentUserUuid: perms.userId,
        }),
      )
      .catch((err: any) => {
        setPendingIsQbo(null); // fall back to whatever the DB actually holds
        createErrorToast(["Failed to update the QuickBooks flag.", err?.message ?? ""]);
      });
  };

  const paidCents = installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Payment Summary
        </h3>
        <div className="space-y-2 text-sm max-w-md">
          <div className="flex justify-between">
            <span>Contract Total</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatMoney(contractTotalCents, currency)}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  quote.eventStatus === "booked"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {quote.eventStatus ?? "Draft"}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Payments Received</span>
            <span className="font-semibold">{formatMoney(paidCents, currency)}</span>
          </div>
          <div className="flex justify-between text-red-600 border-t pt-2">
            <span className="font-medium">Balance Due</span>
            <span className="font-bold">
              {formatMoney(contractTotalCents - paidCents, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* QuickBooks */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">QuickBooks</h3>
        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
          <Checkbox
            checked={isQbo}
            disabled={!canEdit}
            onCheckedChange={(checked) => handleQboChange(checked === true)}
          />
          <span className={!canEdit ? "text-gray-400" : ""}>QuickBooks Invoice</span>
        </label>
      </div>

      {/* Payment Schedule */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Payment Schedule
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading payment schedule...</p>
        ) : (
          <PaymentScheduleTable installments={installments} currency={currency} />
        )}
      </div>

      {/* Payment History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Payment History
          </h3>
          <button className="text-xs font-medium text-darkBlue border border-darkBlue rounded px-2 py-1 hover:bg-blue-50 transition cursor-pointer">
            + Record Payment
          </button>
        </div>
        {installments.filter((i) => i.status === "paid").length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium text-right">Amount</th>
                <th className="py-2 font-medium">Installment</th>
              </tr>
            </thead>
            <tbody>
              {installments
                .filter((i) => i.status === "paid")
                .map((inst, i) => (
                  <tr key={inst.id} className="border-b">
                    <td className="py-2">{formatDateTime(inst.paidAt)}</td>
                    <td className="py-2 text-right font-medium text-green-600">
                      {formatMoney(inst.amountCents, currency)}
                    </td>
                    <td className="py-2 text-gray-500">Due {formatDate(inst.dueDate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center border rounded">
            No payments recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
