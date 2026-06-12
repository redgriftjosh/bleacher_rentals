"use client";

import { QuoteDetail } from "../../../db/fetchQuoteDetail";
import { usePaymentInstallments, PaymentInstallmentRow } from "../../../hooks/usePaymentInstallments";
import { DateTime } from "luxon";

function formatCurrency(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const str = `$${(abs / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  return negative ? `-${str}` : str;
}

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

function PaymentScheduleTable({ installments }: { installments: PaymentInstallmentRow[] }) {
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
              <td className="py-2 text-right font-medium">{formatCurrency(inst.amountCents)}</td>
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
              <td className="py-2 text-gray-500">{inst.paidAt ? formatDateTime(inst.paidAt) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-col items-end gap-1 text-sm">
        <div className="flex gap-8">
          <span className="text-gray-500">Scheduled Total</span>
          <span className="font-medium w-24 text-right">{formatCurrency(totalCents)}</span>
        </div>
        <div className="flex gap-8 text-green-600">
          <span>Paid</span>
          <span className="font-medium w-24 text-right">{formatCurrency(paidCents)}</span>
        </div>
        <div className="flex gap-8 border-t pt-1 mt-1">
          <span className="font-semibold">Remaining</span>
          <span className="font-bold w-24 text-right">{formatCurrency(totalCents - paidCents)}</span>
        </div>
      </div>
    </div>
  );
}

export function BillingTab({ quote, contractTotalCents }: { quote: QuoteDetail; contractTotalCents: number }) {
  const { installments, isLoading } = usePaymentInstallments(quote.id);

  const paidCents = installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment Summary</h3>
        <div className="space-y-2 text-sm max-w-md">
          <div className="flex justify-between">
            <span>Contract Total</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatCurrency(contractTotalCents)}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                quote.eventStatus === "booked" ? "bg-green-100 text-green-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {quote.eventStatus ?? "Draft"}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Payments Received</span>
            <span className="font-semibold">{formatCurrency(paidCents)}</span>
          </div>
          <div className="flex justify-between text-red-600 border-t pt-2">
            <span className="font-medium">Balance Due</span>
            <span className="font-bold">{formatCurrency(contractTotalCents - paidCents)}</span>
          </div>
        </div>
      </div>

      {/* Payment Schedule */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment Schedule</h3>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading payment schedule...</p>
        ) : (
          <PaymentScheduleTable installments={installments} />
        )}
      </div>

      {/* Payment History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Payment History</h3>
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
                      {formatCurrency(inst.amountCents)}
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
