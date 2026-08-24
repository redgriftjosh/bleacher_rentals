/**
 * Language of a client-facing quote surface.
 *
 * Resolved once, in buildQuoteDocumentData(), from the quote contact's
 * Contacts.preferred_language. Nothing downstream re-reads the database —
 * every renderer takes it off QuoteDocumentData.language.
 *
 * See docs/specs/quote-preferred-language.md.
 */
export type QuoteLanguage = "en" | "fr";

/**
 * Maps the Postgres `preferred_language` enum onto a QuoteLanguage.
 *
 * Falls back to English for null (contact-less quote, pre-migration row) and
 * for anything unrecognised — a public quote page must never fail to render
 * because of an unexpected column value.
 */
export function toQuoteLanguage(preferredLanguage: string | null | undefined): QuoteLanguage {
  return preferredLanguage === "french" ? "fr" : "en";
}

/**
 * The languages a client can pick from, in menu order.
 *
 * Labels are endonyms — each language written in itself ("Français", not
 * "French") — which is the web convention and means they never need
 * translating. That is also why they live here as data rather than in
 * quoteStrings.ts.
 *
 * Adding a language (Spanish, say) is: ALTER TYPE preferred_language ADD VALUE,
 * extend QuoteLanguage and PreferredLanguage, add an entry here, then fill in
 * the new key in quoteStrings.ts — TypeScript will list every string still
 * missing it.
 */
export const QUOTE_LANGUAGE_OPTIONS: { value: QuoteLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];
