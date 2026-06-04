"use client";

import { useMemo } from "react";
import { Pencil } from "lucide-react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { formatCurrency } from "../../../utils/formatCurrency";
import { DEFAULT_TAX_RATE } from "../../../data/mockData";

export function PaymentScheduleSection() {
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const currency = useCreateQuoteStore((s) => s.currency);
  const installments = useCreateQuoteStore((s) => s.paymentInstallments);
  const setField = useCreateQuoteStore((s) => s.setField);

  const totalCents = useMemo(() => {
    const subtotal = lineItems
      .filter((i) => i.category !== "discounts")
      .reduce((sum, i) => sum + i.lineTotalCents, 0);
    const discountTotal = lineItems
      .filter((i) => i.category === "discounts")
      .reduce((sum, i) => sum + i.lineTotalCents, 0);
    const taxableAmount = subtotal + discountTotal;
    const taxAmount = Math.round(taxableAmount * (DEFAULT_TAX_RATE / 100));
    return taxableAmount + taxAmount;
  }, [lineItems]);
  const scheduledCents = installments.reduce((sum, i) => sum + i.amountCents, 0);
  const isBalanced = scheduledCents === totalCents;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          Payment Schedule
        </h2>
        <button
          type="button"
          onClick={() => setField("isEditPaymentScheduleModalOpen", true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      </div>

      {installments.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No payment schedule set. Click Edit to add installments.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="rounded border border-gray-200 divide-y divide-gray-100">
            {installments.map((inst, idx) => (
              <div
                key={inst.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-5">#{idx + 1}</span>
                  <span className="font-medium">
                    {inst.dueDate
                      ? new Date(inst.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No date"}
                  </span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(inst.amountCents / 100, currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Summary row */}
          <div className="flex justify-between text-sm px-3">
            <span className="font-medium text-gray-500">Scheduled Total</span>
            <span className={`font-semibold ${isBalanced ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(scheduledCents / 100, currency)}
              {!isBalanced && (
                <span className="text-xs font-normal ml-2">
                  ({scheduledCents > totalCents ? "+" : ""}
                  {formatCurrency((scheduledCents - totalCents) / 100, currency)} vs total)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
