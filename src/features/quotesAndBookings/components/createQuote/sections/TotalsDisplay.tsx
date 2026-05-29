"use client";

import { useMemo } from "react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { DEFAULT_TAX_RATE } from "../../../data/mockData";
import { formatCurrency } from "../../../utils/formatCurrency";

export function TotalsDisplay() {
  const lineItems = useCreateQuoteStore((s) => s.lineItems);
  const currency = useCreateQuoteStore((s) => s.currency);

  const { subtotal, discountTotal, taxableAmount, taxAmount, total } = useMemo(() => {
    const subtotal = lineItems
      .filter((i) => i.category !== "discounts")
      .reduce((sum, i) => sum + i.lineTotal, 0);

    const discountTotal = lineItems
      .filter((i) => i.category === "discounts")
      .reduce((sum, i) => sum + i.lineTotal, 0);

    const taxableAmount = subtotal + discountTotal;
    const taxAmount = taxableAmount * (DEFAULT_TAX_RATE / 100);
    const total = taxableAmount + taxAmount;

    return { subtotal, discountTotal, taxableAmount, taxAmount, total };
  }, [lineItems]);

  return (
    <div className="flex justify-end">
      <div className="space-y-2 w-72">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Subtotal:</span>
          <span className="font-semibold">{formatCurrency(subtotal, currency)}</span>
        </div>
        {discountTotal !== 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span className="font-medium">Discounts:</span>
            <span className="font-semibold">{formatCurrency(discountTotal, currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="font-medium">Tax ({DEFAULT_TAX_RATE}%):</span>
          <span className="font-semibold">{formatCurrency(taxAmount, currency)}</span>
        </div>
        <div className="flex justify-between text-base border-t pt-2 mt-1">
          <span className="font-bold">TOTAL</span>
          <span className="font-bold">{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}
