import { QuotesBookingsEvent } from "../types";

type AmountFields = Pick<QuotesBookingsEvent, "contract_revenue_cents" | "tax_amount_cents">;

/**
 * `contract_revenue_cents` is stored as the grand total (line items after
 * discounts + tax), so the pre-tax subtotal is the total minus the tax.
 */
export function eventSubtotalCents(event: AmountFields): number {
  return (event.contract_revenue_cents ?? 0) - (event.tax_amount_cents ?? 0);
}

export function eventTaxCents(event: AmountFields): number {
  return event.tax_amount_cents ?? 0;
}

export function sumSubtotalCents(events: AmountFields[] | null | undefined): number {
  return (events ?? []).reduce((sum, e) => sum + eventSubtotalCents(e), 0);
}

export function sumTaxCents(events: AmountFields[] | null | undefined): number {
  return (events ?? []).reduce((sum, e) => sum + eventTaxCents(e), 0);
}
