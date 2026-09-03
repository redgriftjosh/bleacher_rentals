import type { Currency } from "../types/quoteTypes";
import { isCanadianProvince } from "../utils/canadianTaxRates";

/**
 * An office's currency is whatever its linked QuickBooks connection reports —
 * the same rule the Sales Offices page states. The province of the office
 * address is only a fallback for offices whose QBO connection has not reported
 * a currency yet (or is missing entirely).
 */
export function resolveOfficeCurrency(
  qboCurrency: string | null | undefined,
  stateProvince: string | null | undefined,
): Currency {
  const normalized = qboCurrency?.trim().toUpperCase();
  if (normalized === "CAD" || normalized === "USD") return normalized;
  return isCanadianProvince(stateProvince) ? "CAD" : "USD";
}
