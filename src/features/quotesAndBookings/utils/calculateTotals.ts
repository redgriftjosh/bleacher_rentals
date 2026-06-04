import { LineItem } from "../types/quoteTypes";

export type TotalsResult = {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
};

export function calculateTotals(
  lineItems: LineItem[],
  taxPercent: number | null,
): TotalsResult {
  const subtotal = lineItems
    .filter((i) => i.category !== "discounts")
    .reduce((sum, i) => sum + i.lineTotalCents, 0);

  const discountTotal = lineItems
    .filter((i) => i.category === "discounts")
    .reduce((sum, i) => sum + i.lineTotalCents, 0);

  const taxableAmount = subtotal + discountTotal;
  const effectiveTaxPercent = taxPercent ?? 0;
  const taxAmount = taxableAmount * (effectiveTaxPercent / 100);
  const total = taxableAmount + taxAmount;

  return { subtotal, discountTotal, taxableAmount, taxAmount, total };
}
