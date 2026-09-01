import { QuotesBookingsEvent } from "../types";

type AmountFields = Pick<
  QuotesBookingsEvent,
  "contract_revenue_cents" | "tax_amount_cents" | "tax_percent"
>;

/**
 * Tax is stored two ways: `tax_amount_cents` holds the amount the quote was
 * saved with (including a manual override), while `tax_percent` holds the rate
 * QuickBooks returned for the event address. Quotes written by the quote form
 * carry both, but rows saved elsewhere — the dashboard event modal, or events
 * predating the tax columns — can carry the rate only, so fall back to it.
 *
 * `contract_revenue_cents` is the grand total (line items after discounts plus
 * tax), so a rate has to be backed out of the total rather than applied to it:
 * total = subtotal * (1 + p/100).
 */
function taxFromPercent(totalCents: number, taxPercent: number): number {
  if (taxPercent <= 0) return 0;
  return Math.round(totalCents - totalCents / (1 + taxPercent / 100));
}

export function eventTaxCents(event: AmountFields): number {
  if (event.tax_amount_cents !== null && event.tax_amount_cents !== undefined) {
    return event.tax_amount_cents;
  }
  const total = event.contract_revenue_cents ?? 0;
  const percent = event.tax_percent;
  if (!total || percent === null || percent === undefined) return 0;
  return taxFromPercent(total, percent);
}

export function eventSubtotalCents(event: AmountFields): number {
  return (event.contract_revenue_cents ?? 0) - eventTaxCents(event);
}

export function sumSubtotalCents(events: AmountFields[] | null | undefined): number {
  return (events ?? []).reduce((sum, e) => sum + eventSubtotalCents(e), 0);
}

export function sumTaxCents(events: AmountFields[] | null | undefined): number {
  return (events ?? []).reduce((sum, e) => sum + eventTaxCents(e), 0);
}
