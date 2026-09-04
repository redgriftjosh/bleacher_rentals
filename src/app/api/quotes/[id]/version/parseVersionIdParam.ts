const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Strictly classify the public route param as an invoice number or a UUID.
 * Anything else (e.g. an injection attempt like `1;DROP TABLE`) returns null so
 * the handler can 404 without ever issuing a query. Pure — unit-tested.
 */
export function parseVersionIdParam(
  raw: string,
): { kind: "invoice_number"; value: number } | { kind: "uuid"; value: string } | null {
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return Number.isSafeInteger(n) ? { kind: "invoice_number", value: n } : null;
  }
  if (UUID_RE.test(raw)) {
    return { kind: "uuid", value: raw };
  }
  return null;
}
