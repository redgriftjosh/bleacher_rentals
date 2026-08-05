# Architecture & Spec: Public Quote — Staleness Detection, Presence Check & Sign-Time Guard

Status: **DRAFT — awaiting "Approved"**
Owner: quotesAndBookings
Route affected: `/quote/[invoiceNumber]` (public, unauthenticated)
Chosen approach: **Option A — stored hash columns on `Events`, maintained by Postgres triggers.**
Existing assets reused: `buildQuoteDocumentData`, `QuotePublicTabs`, `SignContractTab`,
`POST /api/contracts/sign`, `useQuoteActivityTracker` (client→server pattern),
`src/components/ui/dialog.tsx`, `ContractSignatures` (`status` enum `active|invalidated`,
`invalidated_at`).

### Locked decisions
- **D1 = yes** — suppress modals + polling for a signed-in manager previewing the page.
- **D2 = yes** — include fan-out triggers on shared entities (`SalesOffices`,
  `TermsAndConditions`, `Addresses`, `Contacts`) for full correctness.
- **D3 = defer** — no per-IP rate limiting in v1 (endpoint is read-only, leaks nothing).

---

## 1. Summary

The public quote page is a **server component** ([page.tsx](src/app/quote/[invoiceNumber]/page.tsx))
that assembles a quote from ~7 tables via `buildQuoteDocumentData()` using the Supabase
**service-role** key. The client is **anonymous** — no Clerk session, **no PowerSync** on this
route (the documented "online-only" exception per `CLAUDE.md`).

Three problems to solve while the page stays open (30 s … several weeks):

1. **Staleness** — a manager edits the quote → tell the client via a **blocking modal** ("This
   quote has been updated") with a single **Refresh** button.
2. **Presence** — after **15 minutes of absence** (no interaction *and/or* the tab/app is
   backgrounded), show an **"Are you still here?"** modal with a **Yes** button.
3. **Sign-time guard** — when the client signs, the server **re-checks for changes before
   accepting the signed document**, so a signature can never be recorded against terms that
   changed underneath the client.

All three are built so the future **contract re-sign** flow (§12) drops in without rework.

### Non-goals
Live in-place patching of the page; real-time collaborative editing; notifying the manager
that a client is viewing; protecting in-progress payment input.

---

## 2. Architecture decision — polling + stored hash

**The browser polls a read-only REST endpoint every 10 s and compares a content hash. The
hash is stored in the DB (`Events` columns) and kept current by Postgres triggers.**

### Where each side of the comparison lives
- The **current** hash is always produced **server-side** — computing it needs the live DB and
  the service-role key, neither of which exists in the anonymous browser. The endpoint returns
  only the hash string.
- The **baseline** hash (what the page loaded with) lives in **client memory**. The client's
  only job is a string comparison `baseline !== current`.

### Why not a webhook / push?
A **webhook is server→server** (the receiver needs a public URL); an anonymous browser tab has
no address to be pushed to, so it is inapplicable. Browser-native push was rejected:

| Option | Verdict |
| --- | --- |
| WebSocket / SSE / Supabase Realtime | ❌ A change can touch any of ~7 tables ⇒ anon subscriptions + RLS on all of them (large anonymous attack surface); a socket held open for *weeks* is fragile; and it does not help the dominant case — a client returning to a backgrounded tab days later — which a poll-on-focus catches instantly. |
| **Polling a `GET` endpoint (chosen)** | ✅ No persistent connection, no anon table exposure, and O(1) because the poll reads one pre-computed hash column. |

### Why stored columns (Option A) over recompute-on-read (Option B)
Both were evaluated. Option A was chosen: the 10 s poll is a single indexed column read
(cheap at any concurrency), and a **trigger-maintained** hash reflects **every committed
change regardless of the write path** — the strongest correctness guarantee. (Option B — hash
recomputed per request via `buildQuoteDocumentData` — remains a valid drop-in later since the
endpoint contract is identical; only the hash source differs.)

---

## 3. The hash — how it is created

A hash is a **deterministic content fingerprint**: same content ⇒ same hash; any change ⇒
different hash. Determinism requires a **canonical serialization**:

1. Collect the relevant fields into a fixed structure with **fixed key order**.
2. Serialize child collections (line items, installments) **sorted by a stable key**
   (`id` / `due_date`) so table row-order never changes the hash spuriously — while a real
   reorder the client sees *does* change it.
3. `SHA-256` the bytes, hex-encode → the hash string.

Maintained by a Postgres trigger in SQL with `pgcrypto` (`extensions.digest(...)`, already
enabled), over a `jsonb` document built with `jsonb_build_object(...)` +
`jsonb_agg(... ORDER BY ...)`. `jsonb` normalizes key ordering, so
`encode(digest(doc::text,'sha256'),'hex')` is stable for equal content.

### Two hashes (why two)
Each `Events` row carries two, because two different questions need two different field sets:

**`content_hash`** — drives the **"please refresh"** modal; covers everything the client
*sees*: `status, currency, sales-office (name/address/phone), contact (name/email/phone),
po_number, event_name + resolved event address, event_start, event_end, line items (header,
description, quantity, value_cents, currency — ordered), subtotal/discounts, tax_percent,
tax_amount_cents, total, payment schedule (due_date, amount_cents, status — ordered),
client-facing notes, terms_and_conditions_uuid + terms html, quote_valid_till, signed-state
(signer/signed_at)`. Excludes `internal_notes, account manager, publicUrl, eventId,
created_at`.

**`contract_hash`** — drives the **sign-time guard** (§9) and future **re-sign** (§12); covers
**only contract-material terms**: `event_type_uuid, resolved event address, event_start,
event_end, line items (add/remove/qty/price/discount — ordered), payment schedule (ordered),
terms_and_conditions_uuid + terms html, tax_percent + tax_amount_cents, sales_office_uuid
(+ resolved office)`. Deliberately **excludes** `client notes, po_number, contact,
invoice_number` — those must not invalidate a signature.

> Client-notes edit → flips `content_hash` (refresh) but not `contract_hash` (no re-sign). A
> price edit flips **both**.

---

## 4. Where the hash is stored

| What | Where | Lifetime |
| --- | --- | --- |
| Current `content_hash`, `contract_hash` | **`Events` columns** (`text`), trigger-maintained | persisted, always current |
| Page-load baseline for comparison | **client memory** (React state), seeded from the server-rendered `Events` columns passed as props | lives with the open tab |
| Signing snapshot | **`ContractSignatures.signed_contract_hash`** (`text`) = `Events.contract_hash` at signing | persisted per signature |

No Redis/edge cache. The endpoint reads the live column (`force-dynamic`, `no-store`).

---

## 5. DB schema & migrations

New migration `..._quote_content_hash.sql`:

1. `ALTER TABLE "Events" ADD COLUMN content_hash text, ADD COLUMN contract_hash text;`
2. `ALTER TABLE "ContractSignatures" ADD COLUMN signed_contract_hash text;` (used by §9/§12).
3. **`recompute_quote_hashes(p_event_id uuid)`** — `SECURITY DEFINER` function that builds the
   two canonical `jsonb` docs (joining `EventLineItems`, `PaymentInstallments`, `Addresses`,
   `Contacts`, `SalesOffices`, `TermsAndConditions`), hashes each with
   `encode(extensions.digest(doc::text,'sha256'),'hex')`, and
   `UPDATE "Events" SET content_hash=…, contract_hash=… WHERE id=p_event_id` **only when the
   value differs** (`IS DISTINCT FROM`).
4. **Triggers** calling it for the affected event(s):
   - `Events` — `AFTER INSERT OR UPDATE`, guarded by `pg_trigger_depth() < 1` to stop the
     self-`UPDATE` recursing.
   - `EventLineItems`, `PaymentInstallments` — `AFTER INSERT/UPDATE/DELETE` (`OLD`/`NEW` `event_uuid`).
   - **(D2)** `Addresses`, `Contacts` — `AFTER UPDATE` → recompute events referencing the row.
   - **(D2)** `SalesOffices`, `TermsAndConditions` — `AFTER UPDATE` → recompute all events
     referencing the row (bounded fan-out; such edits are rare).
   - `ContractSignatures` — `AFTER INSERT/UPDATE` → recompute `content_hash` (signed-state shows).
5. **Backfill**: `SELECT recompute_quote_hashes(id) FROM "Events";` at migration end.

### PowerSync / AppSchema (CLAUDE.md checklist)
- Add `content_hash`, `contract_hash` to `EventsCols` in
  [AppSchema.ts](src/lib/powersync/AppSchema.ts) (`column.text`) + sync rules if columns are
  enumerated there; add `signed_contract_hash` to the `ContractSignatures` cols.
- `npm run gtl` to regenerate `database.types.ts`.
- The manager app never *writes* these (the trigger does, server-side); they sync **down**
  read-only, so there is no local optimistic-write conflict. The public route reads them
  server-side via service role, not via PowerSync.

---

## 6. API endpoint (version)

**`GET /api/quotes/[id]/version`** — new route handler.

- `export const dynamic = "force-dynamic"; export const revalidate = 0;` (never cached).
- Returns `{ contentHash, contractHash }` — two opaque strings, **no PII**.
- `404 { error: "Event not found" }` if the id does not resolve. Read-only, no side effects.

### Security — no SQL injection for unauthenticated callers
1. **Parameterized queries only** via the Supabase client (`.eq(...)` binds parameters — the id
   is never concatenated into SQL). Primary and sufficient defense.
2. **Validate & coerce the param before querying:** `^\d+$` → integer `invoice_number`; else a
   strict UUID regex → `id`; else `404` without touching the DB.
3. **Least data** — response is only hashes.
4. **Service-role key stays server-side**; the anonymous browser never queries Supabase directly.

---

## 7. Client — 10 s freshness polling (visibility-gated) + cross-browser verification

Hook `useQuoteFreshness(eventId, initialContentHash)`:

- **Driver:** a self-rescheduling `setTimeout` loop at **10 s** (+ small jitter). Not
  `setInterval`, so a slow request can never stack overlapping polls.
- **Poll only when the tab is active — required.** Polling runs **only while the tab is both
  visible and focused**; it **pauses** on `visibilitychange → hidden` or window `blur`, and
  **resumes with an immediate check** on `visibilitychange → visible` or window `focus`. This
  is what covers "returned to the tab after days/weeks" and stops wasting requests when the
  user is on another tab/app.
  - Primary signal: **Page Visibility API** (`document.visibilityState` / `visibilitychange`) —
    also the signal mobile browsers fire when the user switches apps (the page goes `hidden`).
  - Secondary signal: window `focus`/`blur` for the "visible but not the active window" case.
- **Each tick:** `GET /api/quotes/{eventId}/version` with `cache:"no-store"` → compare
  `contentHash` to `initialContentHash`; different ⇒ `isStale = true`.
- **Stops** once stale; aborts the in-flight request and removes listeners on unmount.
- **(D1)** Suppressed entirely when `useAuth().userId` is set (manager preview).

### Cross-browser requirement (explicit)
Page-Visibility semantics differ between engines (background-timer throttling, iOS Safari
freezing JS while backgrounded, app-switch behavior on mobile). The pause/resume behavior
**must be verified** on the popular browsers: **Chrome, Firefox, Safari (macOS), Edge, iOS
Safari, Android Chrome**. The Playwright suite runs the visibility e2e across all three engines
(**Chromium, Firefox, WebKit** — WebKit ≈ Safari); the remaining device-specific checks
(iOS Safari / Android Chrome) are a manual pre-release smoke step recorded in the PR.

### Guarantees
- **Bounded latency:** while the tab is active, a committed change surfaces within **≤ 10 s +
  one RTT**.
- **Completeness:** the compared hash is trigger-maintained ⇒ reflects committed state under
  read-committed isolation; **no committed change is missed**, regardless of write path.
- **No false positives:** flips only on a confirmed `200` + different hash; errors/`404`/`5xx`/
  malformed bodies are ignored and retried.
- **No stale cache:** `no-store` + `force-dynamic`.
- **Not guaranteed:** push/real-time semantics or detection while backgrounded — polling is
  pull-based and paused when inactive, resuming with an immediate check on return.

---

## 8. Client — 15 min presence check ("Are you still here?")

`usePresenceCheck({ idleMs: 15*60*1000 })` tracks `lastActiveAt`.

- **Activity that resets `lastActiveAt`:** `pointerdown`, `mousemove` (throttled), `keydown`,
  `wheel`, `scroll`, `touchstart`, `click`, `visibilitychange → visible`, and clicking **Yes**.
- **"Not moving the mouse" (tab stays visible):** a foreground timer (~30 s while visible)
  fires the modal once `now − lastActiveAt ≥ 15 min`.
- **"Switched to another tab / app":** background timers are unreliable, so on
  `visibilitychange → visible` we read `elapsed = now − lastActiveAt` **before** treating the
  return as activity — if `elapsed ≥ 15 min` show the modal immediately, else reset. So hidden
  time (another tab/app) counts as absence, exactly as required.
- **Yes** → `lastActiveAt = now`, close, resume.
- **(D1)** Suppressed for manager preview.

---

## 9. Sign-time change guard (server-authoritative)

**Requirement:** at signing, verify no changes happened **before** the signed document is
accepted. A client-side poll alone has a race window (a manager could edit in the seconds
between the last poll and the click), so the check is **authoritative on the server**.

Flow (extends `SignContractTab` + `POST /api/contracts/sign`):

1. The Sign tab holds `initialContractHash` (baseline `Events.contract_hash` from page load).
2. On submit, the client sends it as `expectedContractHash` alongside the existing body
   (`eventId, termsAndConditionsUuid, signerName`). *(Optional UX nicety: the client also hits
   `/version` immediately before submit; the server check below is the real guarantee.)*
3. **The sign route, before invalidating/inserting the signature**, reads the live
   `Events.contract_hash` and compares:
   - **Mismatch** → return **`409 { error: "quote_changed" }`** and do **nothing** (no
     invalidate, no insert, no status change).
   - **Match** → proceed as today, and additionally persist
     `ContractSignatures.signed_contract_hash = <current contract_hash>` (the snapshot §12 uses).
4. On `409`, the client shows the **QuoteUpdatedModal** (message tuned to signing: "The quote
   changed before your signature was recorded — please refresh and review"). The signature is
   **not** recorded.

This guarantees a signature is never stored against changed contract terms, even if the 10 s
poll had not yet fired.

---

## 10. Modals & precedence

Built on `src/components/ui/dialog.tsx` (Radix).

- **`QuoteUpdatedModal`** — **blocking**: no backdrop/Esc/X dismiss; only control is **Refresh**
  → `window.location.reload()` (a reload re-renders the server component with fresh data and a
  fresh baseline hash). Reused for both the poll-driven case and the sign-time `409`.
- **`StillHereModal`** — title "Are you still here?", single **Yes** button.
- **Precedence:** a stale quote wins — the update modal shows and the still-here modal is
  suppressed (refreshing also proves presence). Only one modal visible at a time.

---

## 11. TypeScript types & React 19 props

```ts
type QuoteVersionResponse = { contentHash: string; contractHash: string };

type QuoteFreshness = { isStale: boolean; refresh: () => void };
function useQuoteFreshness(eventId: string, initialContentHash: string): QuoteFreshness;

type PresenceState = { promptPresence: boolean; confirmPresent: () => void };
function usePresenceCheck(opts?: { idleMs?: number }): PresenceState;

// sign request gains one field
type SignContractRequest = {
  eventId: string; termsAndConditionsUuid: string; signerName: string;
  expectedContractHash: string;
};

// pure, unit-tested helpers (no DOM)
function hasHashChanged(initial: string, current: string): boolean;
function computePresence(input: { lastActiveAt: number; now: number; idleMs: number }): { idle: boolean };
```

- `page.tsx` reads the two hash columns (same builder query) and passes `initialContentHash` +
  `initialContractHash` to `QuotePublicTabs`, which threads `initialContractHash` into
  `SignContractTab` and renders the two modals.
- `QuoteDocumentData` gains `contentHash: string; contractHash: string` — a spec-locked type
  change; PDF/email ignore them.

---

## 12. Future: contract re-sign (design accommodation — not implemented here)

- The sign route already stores `signed_contract_hash` (§9). Later, the contract tab (with an
  `active` signature) polls `contractHash` and compares to that snapshot; if different → show
  "This quote changed — the contract must be re-signed to stay valid" and set the signature
  `status = 'invalidated'`, `invalidated_at = now()` server-side.
- `contract_hash` already encodes exactly the material terms listed — Event Type, Event
  Address, Start/End, Line Items (add/more/delete/price/discount), Payment Schedule, Terms &
  Conditions, Taxes, Sales Office — so only those trigger a re-sign. This spec ships the
  columns + hash + signing snapshot; the invalidation UI is a follow-up.

---

## 13. Edge cases & error handling

- **Network failure / offline:** poll throws or non-200 → ignored, retried; never a false modal.
- **Event deleted while open:** `404` → treated as "no confirmed change" (deletion ≠ update).
- **Clerk / manager preview (D1):** `useAuth().userId` set → suppress both modals + polling.
- **Multiple tabs:** each tab runs its own hooks.
- **Trigger recursion / no-op writes:** `pg_trigger_depth()` guard + `IS DISTINCT FROM` prevent
  looping and churn.
- **Self-trigger safety:** the server-rendered baseline equals the column the endpoint returns,
  so a fresh load never self-triggers the update modal.
- **Sign race:** covered by the server `409` guard (§9).

---

## 14. Test plan (all tests real — no muting, no hardcoded answers)

### Unit / component (Vitest, `node` env)
- **Hash canonical serializer** (TS mirror used by `page.tsx`, and/or a DB integration test):
  identical→identical, different→different; each contract-material field flips `contract_hash`;
  a client-notes/PO change flips `content_hash` but **not** `contract_hash`; excluded fields
  flip neither; a visible line-item reorder flips the hash.
- **Version endpoint** (mocked builder/reader): returns `{contentHash, contractHash}`; `404`
  for missing; **rejects a malformed/injection-style `id`** (`1;DROP TABLE`) with `404`/`400`
  and never issues a query.
- **Sign route guard:** matching `expectedContractHash` → signs + stores `signed_contract_hash`;
  mismatched → `409`, and **no** signature/invalidate/status write happens.
- **`hasHashChanged`** and **`computePresence`** (idle boundary + hidden-time counting), pure.

### E2E (Playwright) — deterministic via `page.clock`, run across Chromium/Firefox/WebKit
Infra: a new **`anon`** project with **no `storageState`** running `*.public.spec.ts`, plus a
test-only Supabase-admin helper (service-role key, Node side) to mutate the seeded quote.

1. **Change → update modal.** Open the page anonymously; admin-mutate a line-item price (fires
   the trigger); `page.clock.fastForward('00:11')`; assert the update modal; click **Refresh**;
   assert the new total. Negative control: no change → advance clock → modal never appears.
2. **15 min absent → still-here modal.** `page.clock.install()`; background the tab, advance
   `page.clock.fastForward('15:01')`, return to foreground; assert the still-here modal; click
   **Yes**; assert it closes and does not immediately reappear.
3. **Polling pauses when inactive (cross-browser).** Assert a poll fires while active; drive
   `visibilitychange → hidden` (and window `blur`); assert **no** `/version` request is made
   while hidden; on return assert an immediate poll fires. Run in all three engines.
4. **Sign-time guard.** Fill the sign form; admin-mutate a contract-material field; submit;
   assert the sign request returns `409`, the update modal shows, and **no** active signature
   was created (verify via the admin helper).

`page.clock` and network assertions drive genuine behavior — nothing is stubbed to force a pass.

---

## 15. Definition of Done

```
- [ ] TS Compilation (npm run tc):        PASSED
- [ ] Vitest Suites (npm run test):       PASSED
- [ ] Lint (npm run lint):                PASSED (touched files)
- [ ] Playwright E2E (npm run test:e2e):  PASSED (§14 scenarios, all engines)
- [ ] Cross-browser visibility smoke:     DONE (Chrome/Firefox/Safari/Edge + iOS/Android noted in PR)
- [ ] Types regenerated (npm run gtl):    DONE (schema changed)
```
Each backed by real command output; nothing skipped or stubbed.

---

## 16. Files to add / touch (implementation preview — not code)

**Add**
- `supabase/migrations/..._quote_content_hash.sql` (columns, `recompute_quote_hashes`,
  triggers incl. D2 fan-out, backfill)
- `src/app/api/quotes/[id]/version/route.ts` (+ `.test.ts`)
- `src/features/quotesAndBookings/pdf/quoteVersion.ts` (canonical serializer / `hasHashChanged`)
  (+ `.test.ts`)
- `src/features/quotesAndBookings/pdf/useQuoteFreshness.ts`
- `src/features/quotesAndBookings/pdf/usePresenceCheck.ts` (+ pure `computePresence` `.test.ts`)
- `src/features/quotesAndBookings/pdf/QuoteUpdatedModal.tsx`
- `src/features/quotesAndBookings/pdf/StillHereModal.tsx`
- `src/features/quotesAndBookings/e2e/quoteStaleness.public.spec.ts` + admin helper

**Touch**
- `src/lib/powersync/AppSchema.ts` (+ sync rules), `database.types.ts` via `npm run gtl`
- `src/app/quote/[invoiceNumber]/page.tsx` (pass initial hashes)
- `src/features/quotesAndBookings/pdf/QuotePublicTabs.tsx` (wire hooks + modals, thread hash)
- `src/features/quotesAndBookings/pdf/SignContractTab.tsx` (send `expectedContractHash`, handle 409)
- `src/app/api/contracts/sign/route.ts` (server-side hash guard + store `signed_contract_hash`)
- `playwright.config.ts` (add `anon` project / broaden testDir)
```
