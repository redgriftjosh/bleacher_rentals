/**
 * Pure helpers for invoice-number display and quote routing.
 */

/** Returns the display string for a quote: invoice number if available, fallback to eventId (UUID). */
export function resolveInvoiceDisplay(
  invoiceNumber: number | null | undefined,
  eventId: string,
): string {
  return invoiceNumber ? String(invoiceNumber) : eventId;
}

/**
 * Builds the public-facing quote URL. The slug is the event UUID only — invoice
 * numbers are enumerable, so they are never used in public URLs (they remain a
 * display label). See docs/specs/payment-history-security.md.
 */
export function buildPublicQuoteUrl(appOrigin: string, eventId: string): string {
  return `${appOrigin}/quote/${eventId}`;
}
