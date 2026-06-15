/**
 * Pure helpers for invoice-number display and routing logic.
 */

/** Returns the display string for a quote: invoice number if available, fallback to eventId (UUID). */
export function resolveInvoiceDisplay(
  invoiceNumber: number | null | undefined,
  eventId: string,
): string {
  return invoiceNumber ? String(invoiceNumber) : eventId;
}

/** Builds the public-facing quote URL using invoice number when available. */
export function buildPublicQuoteUrl(
  appOrigin: string,
  invoiceNumber: number | null | undefined,
  eventId: string,
): string {
  const slug = resolveInvoiceDisplay(invoiceNumber, eventId);
  return `${appOrigin}/quote/${slug}`;
}

/**
 * Parses a route param that could be an invoice number (9-digit numeric string)
 * or a UUID. Returns { type, value }.
 */
export function parseInvoiceParam(param: string): {
  type: "invoice_number" | "uuid";
  value: string | number;
} {
  const asNumber = Number(param);
  if (!isNaN(asNumber) && String(asNumber) === param && Number.isInteger(asNumber)) {
    return { type: "invoice_number", value: asNumber };
  }
  return { type: "uuid", value: param };
}
