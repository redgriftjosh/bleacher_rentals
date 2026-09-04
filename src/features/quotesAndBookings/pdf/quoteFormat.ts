import type { QuoteLanguage } from "./quoteLanguage";

/**
 * Date and money formatting for client-facing quote surfaces.
 *
 * English output is byte-for-byte what the quote produced before French was
 * added — these helpers replaced six separate copies of the same
 * `toLocaleDateString("en-US", …)` logic, and English quotes must not shift.
 *
 * French is Canadian French (fr-CA): "15 janv. 2026" and "1 234,56 $".
 *
 * See docs/specs/quote-preferred-language.md.
 */

const LOCALE: Record<QuoteLanguage, string> = {
  en: "en-US",
  fr: "fr-CA",
};

const EM_DASH = "—";

/**
 * Accepts both a bare date ("2026-01-15", from Events/installments) and a full
 * timestamp ("2026-01-15T14:30:00Z", from payment history). A bare date is
 * pinned to local midnight so it never slips a day across timezones.
 */
function parse(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value.length === 10 && !value.includes("T") ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * fr-CA groups thousands with a narrow no-break space in newer ICU builds and a
 * regular no-break space in older ones. Normalise so output (and tests) are
 * stable across Node versions.
 */
function normalizeSpaces(value: string): string {
  // \u202F narrow no-break space, \u00A0 no-break space.
  return value.replace(/[\u202F\u00A0]/g, "\u00A0");
}

/** "Jan 15, 2026" | "15 janv. 2026" */
export function formatQuoteDate(value: string, lang: QuoteLanguage): string {
  const date = parse(value);
  if (!date) return EM_DASH;
  return normalizeSpaces(
    date.toLocaleDateString(LOCALE[lang], { month: "short", day: "numeric", year: "numeric" }),
  );
}

/**
 * Signature timestamps: "Jun 10, 2026, 10:30 AM EDT" | "10 juin 2026, 10 h 30 HAE".
 *
 * `timeZone` defaults to the viewer's own zone (a signature is shown in the
 * reader's local time). It is parameterized only so tests can pin a zone.
 */
export function formatQuoteDateTime(value: string, lang: QuoteLanguage, timeZone?: string): string {
  const date = parse(value);
  if (!date) return EM_DASH;
  return normalizeSpaces(
    date.toLocaleString(LOCALE[lang], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      ...(timeZone ? { timeZone } : {}),
    }),
  );
}

/**
 * The event date range shown at the top of the quote.
 * en: "Sunday, Jan 15 - Monday, Jan 16, 2026"
 * fr: "dimanche 15 janv. - lundi 16 janv. 2026"
 */
export function formatQuoteDateRange(start: string, end: string, lang: QuoteLanguage): string {
  const s = parse(start);
  const e = parse(end);
  if (!s || !e) return EM_DASH;

  const locale = LOCALE[lang];
  const weekday = (d: Date) => d.toLocaleDateString(locale, { weekday: "long" });
  const month = (d: Date) => d.toLocaleDateString(locale, { month: "short" });

  if (lang === "fr") {
    return normalizeSpaces(
      `${weekday(s)} ${s.getDate()} ${month(s)} - ${weekday(e)} ${e.getDate()} ${month(e)} ${e.getFullYear()}`,
    );
  }
  return `${weekday(s)}, ${month(s)} ${s.getDate()} - ${weekday(e)}, ${month(e)} ${e.getDate()}, ${e.getFullYear()}`;
}

/**
 * Money, from cents, in the reader's language.
 *
 * en: "$1,234.56" / "C$1,234.56" / "-C$1,234.56"
 * fr: "1 234,56 $" / "1 234,56 $ CA" / "-1 234,56 $ CA"
 *
 * Deliberately not `Intl`'s currency style: that renders CAD as "CA$1,234.56"
 * in English and prints "$ US" on every American amount in French, neither of
 * which is what these quotes show. USD keeps the bare "$" it has always had;
 * only CAD is marked, because a Canadian amount that reads as American is a
 * quote the client can misprice by a third without noticing.
 */
export function formatQuoteMoney(
  cents: number,
  currency: "USD" | "CAD",
  lang: QuoteLanguage,
): string {
  const sign = cents < 0 ? "-" : "";
  const amount = Math.abs(cents) / 100;
  const digits = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

  if (lang === "fr") {
    const formatted = normalizeSpaces(amount.toLocaleString("fr-CA", digits));
    const suffix = currency === "CAD" ? "$\u00A0CA" : "$";
    return `${sign}${formatted}\u00A0${suffix}`;
  }
  const symbol = currency === "CAD" ? "C$" : "$";
  return `${sign}${symbol}${amount.toLocaleString("en-US", digits)}`;
}
