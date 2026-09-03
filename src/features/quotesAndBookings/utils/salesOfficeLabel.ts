import type { SalesOfficeOption } from "../hooks/useSalesOffices";

/**
 * How an office is named in a picker: `Ontario Office (CAD)`.
 *
 * The currency shown is the office's resolved one — its QuickBooks connection,
 * with the address province only as a fallback (`resolveOfficeCurrency`). The
 * dropdown used to re-derive it from the province alone, so an office whose
 * address carries no province was offered as USD while the quote it produced
 * was priced, invoiced and charged in CAD.
 *
 * See docs/specs/payment-accounting-truth.md §3.6 for the one currency rule.
 */
export function salesOfficeLabel(office: SalesOfficeOption): string {
  return `${office.name} (${office.currency})`;
}
