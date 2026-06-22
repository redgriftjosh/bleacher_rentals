export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function dollarsToCents(dollars: string): number {
  const cleaned = dollars.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function formatPriceDollars(cents: number, currency: "USD" | "CAD" = "USD"): string {
  const prefix = currency === "CAD" ? "C$" : "$";
  return `${prefix}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type MatrixKey = `${string}:${string}:${string}`;

export function buildMatrixKey(
  durationId: string,
  eventTypeId: string,
  currency: string,
): MatrixKey {
  return `${durationId}:${eventTypeId}:${currency}`;
}

export function buildPriceMap(
  prices: Array<{
    price_duration_uuid: string | null;
    event_type_uuid: string | null;
    currency: string | null;
    price_cents: number | null;
  }>,
): Map<MatrixKey, number> {
  const map = new Map<MatrixKey, number>();
  for (const p of prices) {
    if (!p.price_duration_uuid || !p.event_type_uuid || !p.currency || p.price_cents == null) continue;
    const key = buildMatrixKey(p.price_duration_uuid, p.event_type_uuid, p.currency);
    map.set(key, p.price_cents);
  }
  return map;
}
