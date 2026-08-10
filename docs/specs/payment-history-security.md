# Spec: PaymentHistory Security + Public Quote UUID Route

Status: **DRAFT — awaiting "Approved"**
Owner: quotesAndBookings / payments
Routes affected:
- Public quote: `/quote/[eventUUID]` (replaces `/quote/[invoiceNumber]`)
- Server APIs: `/api/stripe/webhook`, `/api/payments/history`, `/api/payments/create-checkout`
Existing assets reused: `PayInvoiceTab`, Stripe Checkout create session, webhook
`checkout.session.completed` insert into `PaymentHistory`, `PaymentInstallments` RLS pattern.

---

## 1. Summary

`PaymentHistory` was created **without RLS**. In Supabase that means the table is
reachable via PostgREST for roles that can hit the API — a security hole for payment
PII (payer name/email, amounts, Stripe IDs, receipt URLs).

At the same time, public quote links still use **invoice number** as the URL slug
(` /quote/136287131 `). Invoice numbers are enumerable; event UUIDs are not. Links have
**not** been sent to clients yet (beta), so we cut over to UUID with **no redirect**.

### Goals

1. Lock `PaymentHistory` with RLS so unauthenticated / unauthorized clients cannot
   read or write the table directly.
2. Keep **all writes** server-side: Stripe webhook → shared record helper → service-role
   Supabase insert. The public quote page must never insert into `PaymentHistory`.
3. Change the public quote route from invoice-number slug to **event UUID** only.
4. Preserve current success-only recording behavior (`checkout.session.completed`).

### Non-goals (this iteration)

- Recording **failed** Stripe payments into `PaymentHistory` (leave as today: success only).
- Manual offline payment entry (check / ACH) by admin/AM — planned later; do **not** add
  client INSERT policies now.
- Redirect from old `/quote/<invoiceNumber>` URLs (beta; no client emails sent yet).
- Changing PowerSync schema columns for `PaymentHistory` (no column changes required).

---

## 2. Current behavior (baseline)

| Path | What happens today |
| --- | --- |
| Public page `PayInvoiceTab` | `GET /api/payments/history?eventId=` (read). `POST /api/payments/create-checkout` (starts Stripe). **No direct DB write** of history. |
| Stripe webhook | On `checkout.session.completed`, service-role `insert` into `PaymentHistory` with `status: "succeeded"`, optionally marks `PaymentInstallments` paid. |
| Table RLS | **None** on `PaymentHistory` (bug). `PaymentInstallments` already has RLS. |
| Public URL | `/quote/[invoiceNumber]` with UUID fallback via `parseInvoiceParam` / `buildQuoteDocumentDataByInvoice`. |

---

## 3. Architecture decisions

### 3.1 Writes: webhook + service role only

- Browser / PowerSync clients **must not** insert or update `PaymentHistory`.
- Extract insert (+ installment update) logic from the webhook route into a small
  shared server module (e.g. `recordPaymentHistoryFromCheckoutSession`) so the route
  stays thin and the write path is unit-testable without HTTP.
- Continue using Supabase **service role** for webhook writes (bypasses RLS by design).

### 3.2 Reads

| Consumer | Mechanism |
| --- | --- |
| Staff app (authenticated) | PowerSync sync of `PaymentHistory` — requires SELECT RLS for staff roles |
| Public quote page (anonymous) | Existing `GET /api/payments/history?eventId=` using service role (online-only exception; table itself stays locked) |

Knowing an `eventId` remains the capability token for the public history API (same as
viewing the public quote). UUID URLs make enumeration impractical.

### 3.3 Failed payments

**Out of scope.** Do not add `payment_intent.payment_failed` (or similar) handlers in
this iteration. Only `checkout.session.completed` → `succeeded` rows, as today.

### 3.4 Route: UUID only, no redirect

- New folder param: `src/app/quote/[eventUUID]/page.tsx`
- Resolve quote via `buildQuoteDocumentData(eventUUID)` only
- Remove invoice-number-as-slug resolution from the public route
- Invoice number remains a **display label** on the document / UI, not part of the URL
- Old `/quote/<invoiceNumber>` → **404** (no redirect; beta, unused by clients)

---

## 4. Data / Schema

### 4.1 Existing table (unchanged columns)

```sql
-- already exists: supabase/migrations/20260614250000_payment_history.sql
"PaymentHistory" (
  id uuid PK,
  event_uuid uuid NOT NULL → Events(id),
  installment_id uuid NULL → PaymentInstallments(id),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_receipt_url text,
  payment_method_type text,
  payer_name text NOT NULL,
  payer_email text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
)
```

PowerSync `AppSchema.ts` / `PaymentHistoryCols` — **no column changes**.

### 4.2 New migration — RLS (+ optional idempotency)

New file `supabase/migrations/<timestamp>_payment_history_rls.sql`.

Mirror the staff-facing pattern from `PaymentInstallments` (`20260604110000_send_quotes.sql`):

```sql
alter table public."PaymentHistory" enable row level security;

-- Staff read (PowerSync + authenticated app)
create policy "payment_history_select" on public."PaymentHistory"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- Intentionally NO insert / update / delete policies for anon or authenticated.
-- Writes happen only via service role (Stripe webhook / server APIs).
```

**Locked policy contract**

| Role | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `anon` | deny | deny | deny | deny |
| `authenticated` without staff role | deny | deny | deny | deny |
| `admin` / `account_manager` / `viewer` | allow | deny | deny | deny |
| service role (webhook) | allow (bypass) | allow (bypass) | allow (bypass) | allow (bypass) |

Optional (recommended, same migration if low-risk): unique index on
`stripe_checkout_session_id` WHERE NOT NULL so webhook retries do not duplicate rows.
If added, webhook helper must upsert / ignore conflict on that key.

### 4.3 TypeScript / API contracts (locked)

No change to public JSON shapes of:

- `GET /api/payments/history?eventId=` → array of payment rows (existing fields)
- `POST /api/payments/create-checkout` body / `{ url }` response

Webhook still returns `{ received: true }` on handled success path after signature
verification. Insert failures must be logged; prefer failing the webhook response
(non-2xx) on DB insert error so Stripe retries, rather than silently acknowledging.

---

## 5. Application changes

### 5.1 Webhook write helper

- Move `PaymentHistory` insert (+ installment `paid` update) out of inline route body
  into a dedicated server module under `src/features/stripe-integration/` (or
  `src/app/api/payments/_lib/`).
- Input: verified Stripe `checkout.session.completed` session (+ optional receipt URL
  fetch already in route).
- Output: insert result / error; caller maps to HTTP status.
- **Event handled:** `checkout.session.completed` only (unchanged).

### 5.2 Public quote route rename

| Before | After |
| --- | --- |
| `src/app/quote/[invoiceNumber]/page.tsx` | `src/app/quote/[eventUUID]/page.tsx` |
| `buildQuoteDocumentDataByInvoice(param)` | `buildQuoteDocumentData(eventUUID)` |
| `buildPublicQuoteUrl(..., invoiceNumber, eventId)` → prefers invoice # | always `/quote/${eventId}` |
| Checkout `success_url` / `cancel_url` | `/quote/${eventId}?payment=success\|cancelled` |
| `ContractTab` / any in-app “open public quote” link | UUID slug |

`proxy.ts` / `AuthFallback` public prefix `/quote/` stays valid.

Invoice display helpers may still format invoice numbers for UI labels; they must not
be used as the public route slug.

### 5.3 Public page write surface

Confirm and keep:

- `PayInvoiceTab` — **read** history via API; **start** checkout via API; never
  `supabase.from("PaymentHistory").insert(...)`.
- No new client write APIs for history in this iteration.

---

## 6. User / security scenarios

1. **Anonymous** user opens `/quote/<valid-event-uuid>` → quote loads; history readable
   via history API for that `eventId` only.
2. **Anonymous** (or any non–service-role client) attempts direct PostgREST
   `select`/`insert` on `PaymentHistory` → denied by RLS.
3. **Staff** (admin / AM / viewer) with PowerSync → can **see** payment history rows
   sync; cannot write history from the client.
4. Customer completes Stripe Checkout → webhook inserts `status = succeeded` and
   optionally marks installment paid.
5. Customer cancels Checkout → no history row (unchanged).
6. Request to `/quote/<invoice-number>` → **404** (no redirect).
7. Checkout redirect URLs after pay → land on `/quote/<eventUUID>?payment=...`.

---

## 7. Edge cases & error handling

| Case | Behavior |
| --- | --- |
| Webhook missing `Stripe-Signature` / invalid sig | 400; no DB write |
| `checkout.session.completed` without `metadata.eventId` | 400; no insert |
| Receipt URL fetch fails | still insert history; `stripe_receipt_url` null |
| Installment update fails after history insert | log error; history row remains (document; do not roll back unless trivial to add transaction) |
| Duplicate webhook delivery | unique on session id (if added) prevents duplicate rows; otherwise document risk |
| Clerk / offline | public quote path is online-only + service-role APIs (existing exception) |

---

## 8. Tests (required for Definition of Done; details locked at implementation)

Unit / API:

- Webhook success path inserts `PaymentHistory` with `succeeded` and correct fields
  from session metadata/amounts.
- Invalid signature → 400, no insert.
- Missing `eventId` metadata → error, no insert.
- RLS: anon cannot read/write (migration or integration assertion as project allows).
- `create-checkout` success/cancel URLs use event UUID.
- Public URL helpers always produce `/quote/<uuid>`.
- History GET still returns rows for a given `eventId` (service-role path).

E2E:

- `/quote/<eventUUID>` loads pay tab.
- After successful payment webhook (mocked/test harness), history shows a succeeded row.
- `/quote/<invoiceNumber>` does not resolve a quote (404).
- No silenced/skipped tests; no hardcoded “always pass” stubs that skip side-effect asserts.

Final cycle per `CLAUDE.md`: `npm run tc`, `npm run test`, `npm run lint`,
`npm run test:e2e` — show real output.

---

## 9. Implementation order (after "Approved")

1. TDD: webhook record-helper tests (red) → helper + thin webhook route (green).
2. RLS migration (+ optional unique on `stripe_checkout_session_id`).
3. Route rename + URL / checkout redirect updates.
4. Confirm public UI has no direct writes.
5. Unit + E2E + full green DoD cycle.

---

## 10. Decisions locked from product

1. **Public links = event UUID only.** No redirect from invoice-number URLs (beta;
   not sent to clients).
2. **Success-only history** for now — same as current webhook (`checkout.session.completed`).
   Failed payment recording deferred.
3. **Manual staff payment entry** deferred; no INSERT policies for authenticated users now.