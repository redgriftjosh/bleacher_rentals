import { Currency } from "../types/quoteTypes";

/**
 * The one place a quote amount turns into text on internal screens.
 *
 * CAD is marked. A Canadian quote shown as "$1,000.00" next to an American one
 * is indistinguishable from it, and the two are not worth the same — so CAD
 * renders as "C$1,000.00" everywhere: the quote list, the quote detail header,
 * Billing, Contract and the create-quote screens.
 *
 * USD output is byte-for-byte what it has always been.
 *
 * The client-facing quote, PDF and emails go through `formatQuoteMoney`
 * instead, which applies the same rule in the reader's own language.
 */
const SYMBOL: Record<Currency, string> = {
  USD: "$",
  CAD: "C$",
};

/** The symbol on its own — for input prefixes and table headers. */
export function currencySymbol(currency: Currency): string {
  return SYMBOL[currency] ?? SYMBOL.USD;
}

export function formatMoney(cents: number, currency: Currency = "USD"): string {
  const symbol = currencySymbol(currency);
  const formatted = (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cents < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}
