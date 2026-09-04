import { Currency } from "../types/quoteTypes";
import { currencySymbol, formatMoney } from "./formatMoney";

/**
 * Same money, given in dollars rather than cents — the create-quote screens keep
 * their working amounts that way. One implementation, so a CAD quote cannot be
 * marked "C$" on one screen and left bare on the next.
 */
export function formatCurrency(amount: number, currency: Currency): string {
  return formatMoney(Math.round(amount * 100), currency);
}

export { currencySymbol };
