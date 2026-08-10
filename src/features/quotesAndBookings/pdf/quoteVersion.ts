/**
 * Client-side helpers for public-quote staleness detection.
 *
 * The content fingerprint itself is produced and stored by a Postgres trigger (see the
 * migration + docs/specs/quote-staleness-detection.md); the client only ever compares
 * two opaque strings and never computes a hash.
 */

export type QuoteVersion = { contentHash: string; contractHash: string };

/** Has the quote changed since the page rendered? Pure — unit-tested without a DOM. */
export function hasHashChanged(initial: string, current: string): boolean {
  return initial !== current;
}

export type FreshnessResult =
  | { stale: boolean; contentHash: string; contractHash: string; status: number }
  | { stale: false; status: null; error: string };

/**
 * One freshness check: fetch the current version and compare its contentHash to the one
 * the page rendered with. Never reports `stale` on anything but a confirmed 200 with a
 * different hash — network errors, 404, 5xx and malformed bodies all resolve to
 * `stale: false`. Pure w.r.t. React so it can be tested with a mock fetcher.
 */
export async function checkQuoteFreshness(
  eventId: string,
  initialContentHash: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<FreshnessResult> {
  try {
    const res = await fetcher(`/api/quotes/${eventId}/version`, { signal, cache: "no-store" });
    if (!res.ok) {
      return { stale: false, contentHash: "", contractHash: "", status: res.status };
    }
    const body = (await res.json()) as Partial<QuoteVersion>;
    const contentHash = typeof body.contentHash === "string" ? body.contentHash : "";
    const contractHash = typeof body.contractHash === "string" ? body.contractHash : "";
    const stale = contentHash !== "" && hasHashChanged(initialContentHash, contentHash);
    return { stale, contentHash, contractHash, status: res.status };
  } catch (e) {
    return { stale: false, status: null, error: e instanceof Error ? e.message : String(e) };
  }
}
