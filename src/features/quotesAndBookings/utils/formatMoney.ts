import { Currency } from "../types/quoteTypes";

export function formatMoney(cents: number, currency: Currency = "USD"): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const symbol = "$";
  const formatted = (abs / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}
