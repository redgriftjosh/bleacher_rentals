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
