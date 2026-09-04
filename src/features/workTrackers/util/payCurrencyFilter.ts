/**
 * Currency filter for the weekly driver list (`/work-trackers/<week-start>`).
 *
 * `Drivers.pay_currency` is nullable locally, and the rest of the page already
 * renders a missing currency as USD (see `DriverListForWeek`), so the filter has
 * to agree with that instead of dropping those drivers from both options.
 */

export const PAY_CURRENCIES = ["CAD", "USD"] as const;
export type PayCurrency = (typeof PAY_CURRENCIES)[number];

/** `"ALL"` is the default: no filtering. */
export type PayCurrencyFilter = "ALL" | PayCurrency;

export const DEFAULT_PAY_CURRENCY: PayCurrency = "USD";

/** Fills in the default currency and normalises casing / stray whitespace. */
export function normalizePayCurrency(value: string | null | undefined): PayCurrency {
  const normalized = value?.trim().toUpperCase();
  return (PAY_CURRENCIES as readonly string[]).includes(normalized ?? "")
    ? (normalized as PayCurrency)
    : DEFAULT_PAY_CURRENCY;
}

/** Narrows an arbitrary `<select>` value back to a filter, defaulting to "ALL". */
export function parsePayCurrencyFilter(value: string): PayCurrencyFilter {
  return (PAY_CURRENCIES as readonly string[]).includes(value) ? (value as PayCurrency) : "ALL";
}

export function matchesPayCurrency(
  value: string | null | undefined,
  filter: PayCurrencyFilter,
): boolean {
  if (filter === "ALL") return true;
  return normalizePayCurrency(value) === filter;
}
