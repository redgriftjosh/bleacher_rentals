"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { formatCurrency } from "../../../utils/formatCurrency";
import { calculateTotals } from "../../../utils/calculateTotals";

export function TotalsDisplay() {
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const currency = useCreateQuoteStore((s) => s.currency);
  const taxPercent = useCreateQuoteStore((s) => s.taxPercent);
  const taxLoading = useCreateQuoteStore((s) => s.taxLoading);

  const { subtotal, discountTotal, taxAmount, total } = useMemo(
    () => calculateTotals(lineItems, taxPercent),
    [lineItems, taxPercent],
  );

  const taxLabel = taxPercent !== null
    ? `Tax (${taxPercent.toFixed(2)}%)`
    : "Tax";

  return (
    <div className="flex justify-end">
      <div className="space-y-2 w-72">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Subtotal:</span>
          <span className="font-semibold">{formatCurrency(subtotal / 100, currency)}</span>
        </div>
        {discountTotal !== 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span className="font-medium">Discounts:</span>
            <span className="font-semibold">{formatCurrency(discountTotal / 100, currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="font-medium flex items-center gap-1">
            {taxLabel}
            {taxLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
          </span>
          <span className="font-semibold">
            {taxPercent !== null
              ? formatCurrency(taxAmount / 100, currency)
              : <span className="text-gray-400 text-xs">Select office & address</span>
            }
          </span>
        </div>
        <div className="flex justify-between text-base border-t pt-2 mt-1">
          <span className="font-bold">TOTAL</span>
          <span className="font-bold">{formatCurrency(total / 100, currency)}</span>
        </div>
      </div>
    </div>
  );
}
