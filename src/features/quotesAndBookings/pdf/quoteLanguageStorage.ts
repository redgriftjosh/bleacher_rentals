import type { QuoteLanguage } from "./quoteLanguage";

/**
 * Remembers a client's language choice for one quote, in their own browser.
 *
 * Deliberately NOT written back to Contacts.preferred_language: /quote/[id] is
 * unauthenticated, so persisting there would let anyone holding a quote link
 * mutate a shared CRM row that other quotes read from. The client's browser
 * remembers their preference; the account manager learns the contact record is
 * wrong from the client_language_change entry in the activity trail.
 *
 * Scoped per quote so one client's correction never changes another quote.
 *
 * See docs/specs/quote-preferred-language.md.
 */

const PREFIX = "quote-language:";

function storage(): Storage | null {
  // Server render, or a browser with storage disabled / blocked by privacy
  // settings. Either way the quote must still render — fall back to the
  // language resolved from the contact record.
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredQuoteLanguage(eventId: string): QuoteLanguage | null {
  // getItem itself throws when storage is blocked by policy, not just the
  // property access — so the call has to be inside the guard too. An unknown or
  // tampered value falls back to the contact's language rather than rendering
  // something undefined.
  try {
    const value = storage()?.getItem(PREFIX + eventId);
    return value === "en" || value === "fr" ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredQuoteLanguage(eventId: string, language: QuoteLanguage): void {
  try {
    storage()?.setItem(PREFIX + eventId, language);
  } catch {
    // Quota or private-mode failure: the toggle still works for this page view.
  }
}
