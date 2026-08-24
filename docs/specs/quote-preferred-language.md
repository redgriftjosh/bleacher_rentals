# Quote Preferred Language (English / Canadian French)

Status: **approved & implemented** (2026-08-24)

Lets a contact be marked as French-speaking so every client-facing surface of
their quote — public page, sign-contract tab, pay-invoice tab, and the PDF —
renders in Canadian French, with fr-CA date and money formatting.

---

## 1. Scope

**In scope**

| Surface                     | File                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Public quote page + tab bar | `pdf/QuotePublicTabs.tsx`, `pdf/QuotePublicView.tsx`                                                        |
| Sign Contract tab + modals  | `pdf/SignContractTab.tsx`, `pdf/QuoteUpdatedModal.tsx`, `pdf/StillHereModal.tsx`                            |
| Pay Invoice tab             | `pdf/PayInvoiceTab.tsx`, `pdf/PaymentSuccessView.tsx`                                                       |
| Quote PDF + contract pages  | `pdf/QuotePdfDocument.tsx`, `pdf/ContractPdfPages.tsx`                                                      |
| Stripe Checkout chrome      | `app/api/payments/create-checkout/route.ts` (`locale: "fr-CA"`)                                             |
| Contact language UI         | `companiesContacts/components/{Create,Detail}ContactModal.tsx`, `quotesAndBookings/.../NewContactModal.tsx` |

**Out of scope (deliberate)**

- **Quote emails.** Subject/body are operator-authored per-office rows in
  `EmailTemplates` (`automaticEmails/server/sendTriggerEmail.ts`). Josh will make
  these customisable in-app separately.
- **Terms & Conditions text.** Already per-quote selectable
  (`TermsAndConditions.html_content`, chosen in `TermsSection.tsx`). A French T&C
  is authored as its own row and selected on the quote. No code change needed.
- **The internal app UI.** Only what the customer sees is translated.
- `pdf/quoteEmailHtml.ts` — dead code, nothing imports `buildQuoteEmailHtml`.
  Left untouched (flagged for separate deletion).

---

## 2. Database

New migration `supabase/migrations/<ts>_contact_preferred_language.sql`:

```sql
CREATE TYPE public.preferred_language AS ENUM ('english', 'french');

ALTER TABLE public."Contacts"
  ADD COLUMN IF NOT EXISTS preferred_language public.preferred_language
    NOT NULL DEFAULT 'english';
```

Enum (not `text` + check) so a third language is one `ALTER TYPE ... ADD VALUE`
away and Postgres rejects anything else.

**Not** added to `recompute_quote_hashes` — language changes the presentation of
a quote, not its content, so it must not fire the "this quote has been updated"
modal at the client. (Called out here because `Contacts` _is_ in the content
hash; only the listed keys are hashed, so no change is required.)

### PowerSync

`src/lib/powersync/AppSchema.ts` — add `preferred_language: column.text` to
`ContactsCols`. Enums arrive as text locally; the `PowerSyncColsFor<"Contacts">`
constraint plus `npm run gtl` keeps this honest.

---

## 3. Types

```ts
// pdf/quoteLanguage.ts
export type QuoteLanguage = "en" | "fr";
```

`QuoteDocumentData` gains one field:

```ts
language: QuoteLanguage; // resolved from Contacts.preferred_language
```

`buildQuoteDocumentData` selects `preferred_language` on the existing
`Contacts!Events_contact_uuid_fkey` join and maps
`"french" -> "fr"`, everything else (including a null contact) `-> "en"`.
Nothing downstream fetches language on its own — one resolution point.

Contact db helpers (`companiesContacts/db/createContact.ts`, `updateContact.ts`,
`quotesAndBookings/db/createContact.ts`) take an optional
`preferredLanguage: "english" | "french"` defaulting to `"english"`.

---

## 4. Translation mechanism — one editable file

No i18n library. A single `src/features/quotesAndBookings/pdf/quoteStrings.ts`
holds **every** customer-facing string, one key per string, English and French
adjacent so a phrase can be found with one search and changed on the spot:

```ts
export const quoteStrings = {
  tabApprovedQuote: { en: "Approved Quote", fr: "Devis approuvé" },
  tabSignedContract: { en: "Signed Contract", fr: "Contrat signé" },
  colDescription: { en: "Description", fr: "Description" },
  subtotal: { en: "Subtotal", fr: "Sous-total" },
  // …
} as const;

export type QuoteStringKey = keyof typeof quoteStrings;

export function t(lang: QuoteLanguage, key: QuoteStringKey): string {
  return quoteStrings[key][lang];
}
```

- Each entry is `{ en, fr }`, so both variants are required — a new key that
  forgets French is a **TS error**, not a silent English fallback.
- Interpolation stays explicit: keys needing values are functions,
  e.g. `taxWithPercent: { en: (p) => \`Tax (${p}%)\`, fr: (p) => \`Taxes (${p} %)\` }`(note the French non-breaking space before`%`).
- Components take `lang` from `data.language` and call `t(lang, "…")`.
  A `useQuoteStrings(lang)` helper returns a bound `t` for the busiest files.

**Editing later**: change a string in `quoteStrings.ts` only. No component
edits, no key renames, no digging.

### French variant

Canadian French (fr-CA) conventions: _Devis_, _Sous-total_, _Taxes_,
_Montant dû_, _Solde restant_, `Signé par`. Quebec spacing rules —
non-breaking space before `%`, `$` and `:`.

---

## 5. Formatting

New `pdf/quoteFormat.ts`, replacing the six scattered
`toLocaleDateString("en-US", …)` calls:

```ts
formatQuoteDate(iso, lang); // "Jan 15, 2026"      | "15 janv. 2026"
formatQuoteDateTime(iso, lang); // signature timestamps
formatQuoteMoney(cents, cur, lang);
```

- Locale: `en-US` → `fr-CA`.
- Money in French: `1 234,56 $` (trailing symbol, narrow-nbsp group separator,
  comma decimal) via `Intl.NumberFormat("fr-CA", { style: "currency", currency })`.
  Negatives render `-1 234,56 $`.
- `utils/formatCurrency.ts` (internal app UI) is **not** changed — internal
  screens stay English.
- `formatSignedAt` in `SignContractTab.tsx` keeps its `timeZone` test hook and
  gains a `lang` argument.

---

## 6. Behaviour scenarios (Playwright / manual)

1. **English contact (default)** — public quote, all three tabs, and the PDF are
   byte-for-byte what they are today. This is the regression guard.
2. **French contact** — `/quote/[id]` renders tab bar, headers, table columns,
   totals, notes heading and buttons in French; dates read `15 janv. 2026`;
   totals read `1 234,56 $`.
3. **PDF** — `/api/quotes/[id]/pdf` for a French contact is French throughout,
   including the contract pages.
4. **Pay tab** — French copy; Stripe Checkout opens with French chrome.
5. **Sign tab** — French copy; after signing, `Signé par X le 15 janv. 2026`.
6. **T&C** — renders whatever HTML the selected T&C row holds, untranslated, in
   both languages.
7. **Switching a contact to French** and reloading the public page shows French
   **without** firing the "quote has been updated" modal.

---

## 7. Edge cases

| Case                                               | Behaviour                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Quote has no contact (`contact_uuid` null)         | `language: "en"`                                                             |
| `preferred_language` null on a pre-migration row   | Default `'english'` covers it; mapper still falls back to `"en"`             |
| Unknown enum value arriving from PowerSync as text | Falls back to `"en"` (never throws on a public page)                         |
| French quote, English-only T&C selected            | Chrome French, T&C English — expected, documented                            |
| Offline PowerSync when editing a contact           | Local write, syncs later — standard PowerSync behaviour, no special handling |
| Clerk auth failure on the public page              | Unaffected; `/quote/[id]` is unauthenticated already                         |

---

## 8. Tests

- `quoteStrings.test.ts` — every key has both `en` and `fr`; no French value is
  accidentally identical to its English one for keys that must differ.
- `quoteFormat.test.ts` — date and money formatting in both languages, negatives,
  zero, CAD vs USD.
- `QuotePublicView` render test — English snapshot unchanged; French renders
  French labels.
- `SignContractTab.test.ts` — deleted. `formatSignedAt` moved into `quoteFormat.ts`
  as `formatQuoteDateTime`, and its three timezone/DST cases moved with it into
  `quoteFormat.test.ts` (plus a French case). No coverage was lost.

Then the Definition-of-Done cycle: `npm run gtl`, `npm run tc`, `npm run test`,
`npm run lint`. Playwright only on request.

---

## 9. Files touched

**New** — migration, `pdf/quoteStrings.ts`, `pdf/quoteFormat.ts`, `pdf/quoteLanguage.ts`, 3 test files.
**Modified** — `AppSchema.ts`, `database.types.ts` (generated), `quoteDocumentData.ts`,
the 8 `pdf/*` render files, `create-checkout/route.ts`, 3 contact modals, 3 contact db helpers.

---

## 10. Client-side language toggle

An EN | FR switch in the public quote header lets a client correct the language
when the account manager set the wrong one on their contact record.

- **Stored in the client's browser only** (`localStorage`, key
  `quote-language:{eventId}`), never written back to
  `Contacts.preferred_language`. `/quote/[id]` is unauthenticated, so persisting
  there would let anyone holding a quote link mutate a shared CRM row that other
  quotes read from. Scoped per quote, so one correction never affects another.
- **Read after mount**, never during render, so the server render and the first
  client render agree. Unknown, tampered or unreadable values fall back to the
  contact's language.
- **One localized copy** of `QuoteDocumentData` feeds every tab, the modals and
  the PDF link, so a switch can never leave half the page in the other language.
- **The PDF follows it**: the download link carries `?lang=`, and
  `/api/quotes/[id]/pdf` honours `en` / `fr`. Anything else keeps the contact's
  language.
- **The payment-success page follows it too** — Stripe redirects to its own
  route, which reads the same stored preference.
- **Logged** as `client_language_change` in the activity trail (English labels,
  like the tab-change events), so the account manager finds out the contact
  record is wrong and can fix it for future quotes. Allowlisted in
  `api/quotes/[id]/activity/route.ts`; no migration needed.
- The visible `EN` / `FR` labels are ISO codes, not copy — they stay identical
  in both languages so a French speaker can find the switch on an English page.
  The buttons' accessible names _are_ copy and come from `quoteStrings.ts`.
