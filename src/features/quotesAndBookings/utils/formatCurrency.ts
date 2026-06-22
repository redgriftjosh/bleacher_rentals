import { Currency } from "../types/quoteTypes";

const CURRENCY_CONFIG: Record<Currency, { symbol: string; locale: string }> = {
  USD: { symbol: "$", locale: "en-US" },
  CAD: { symbol: "$", locale: "en-CA" },
};

export function formatCurrency(amount: number, currency: Currency): string {
  const config = CURRENCY_CONFIG[currency];
  const formatted = Math.abs(amount).toLocaleString(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? "-" : "";
  return `${sign}${config.symbol}${formatted}`;
}

export function currencySymbol(currency: Currency): string {
  return CURRENCY_CONFIG[currency].symbol;
}
