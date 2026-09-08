import tzLookup from "tz-lookup";

/**
 * Resolves the IANA time zone (e.g. "America/Toronto") a lat/lng falls in, so
 * a pickup/dropoff time can be picked and displayed in the right local zone
 * without asking anyone to select it by hand. Pure offline lookup (no API
 * call, no network dependency) — see docs/specs (pickup/dropoff timezone).
 *
 * Returns null when there's no coordinate to look up (address not yet
 * geocoded) or when tz-lookup itself can't resolve one (e.g. international
 * waters — not a case this app's addresses should ever hit).
 */
export function deriveTimezone(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (lat == null || lng == null) return null;
  try {
    return tzLookup(lat, lng);
  } catch {
    // tz-lookup throws on out-of-range lat/lng rather than returning null.
    return null;
  }
}

/**
 * The current browser's IANA zone — the fallback used when an address has no
 * coordinates yet (see docs/specs: pickup/dropoff timezone). Always resolves
 * to something real; `Intl` guarantees a zone identifier.
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
