# Spec: Payment Accounting — PaymentHistory as the source of truth

Status: **Implemented** (rev. 4, shipped 2026-09-03) — §3.2 and §3.7 partly
superseded by [payment-does-not-invalidate-signature.md](./payment-does-not-invalidate-signature.md);
see the dated notes inline
Owner: quotesAndBookings / payments
Routes affected:

- Staff: `/quotes-bookings/[id]?tab=billing`
- Public: `/quote/[eventUUID]` (Pay tab + quote document + PDF)
- Server: `/api/stripe/webhook`

Related: [payment-history-security.md](./payment-history-security.md)

> **Rev. 3 — review answers.** Canonical payment order defined (§3.1);
> `paid_at` invariant (§3.1); targeted overflow confirmed (§3.1); per-payment
> allocation breakdown added to the return type, needed by the history table
> (§3.1, §6.3); currency rule made exact and exclusionary (§3.6);
> `PaymentInstallments.status` formally declared a derived cache with the full
> list of call sites that must stop reading it — **including the client-facing
> PDF** (§3.7); FK/`ON DELETE SET NULL` pulled **into** scope, which adds the
> spec's only migration (§4, E5); webhook concurrency analysed (§3.8); T0 given
> pass/fail criteria (§3.3); scenarios S8–S12 added (§7).
>
> **Rev. 4 — accounting decisions (owner's call, 2026-09-02).** Re-allocating a
> historical payment onto a different installment changes what that payment
> _means_, after the fact. That was a side effect of the FIFO rule, not a
> decision, and it is now settled explicitly: **an installment that has received
> money cannot be deleted** (§4.1), and **the payment's original target is kept
> forever** in its own column (§4.2). The rev. 3 `ON DELETE SET NULL` migration
> is therefore **dropped** — the FK stays restrictive on purpose. The real work
> moves into `syncPaymentInstallments`, which must stop deleting rows it is only
> editing (§4.3).
>
> Rev. 2: module moved to `utils/`; PowerSync sync-rule availability downgraded to
> a blocking pre-check; TDD ordering; performance constraints.

---

## 1. Summary

Two production bugs, one root cause.

**Bug 1 — a partial payment closes a whole installment.** The Stripe webhook sets
`PaymentInstallments.status = 'paid'` with no comparison against the installment
amount ([webhook/route.ts:161](../../src/app/api/stripe/webhook/route.ts)). In
production a $1.00 payment closed a $3600.00 installment (event `17c49060`) and
another $1.00 closed $2700.00 (event `4b405a0a`). Balance Due is understated by the
full installment nominal.

**Bug 2 — a payment on a quote with no schedule is invisible to staff.** With an
empty schedule the public page sends `installmentId: ""`, so no installment is
touched. The row lands in `PaymentHistory` and the client sees it, but
[BillingTab.tsx:206](../../src/features/quotesAndBookings/components/quoteDetail/tabs/BillingTab.tsx)
reads only `PaymentInstallments` and reports "No payments recorded yet" with
`Payments Received = $0`. Production events `9526f083`, `42200f93`, `506f58cd`.

**Root cause.** "How much money came in" is derived from a boolean-ish flag
(`PaymentInstallments.status`) instead of from the actual amounts in
`PaymentHistory`. Every consumer that answers a money question from that flag is
wrong whenever a payment is not exactly one installment.

### Goals

1. `PaymentHistory` becomes the single source of truth for money received.
2. One shared pure allocation function used by every consumer — staff UI, public
   UI, PDF, and the webhook — so they can no longer disagree.
3. `PaymentInstallments.status` becomes a _derived cache_ of that function, never
   an independent fact (§3.7).
4. Payments with no `installment_id` (no schedule, or ad-hoc amounts) are counted
   in every balance.
5. Staff Billing shows real payments with their real metadata.

### Non-goals (this iteration)

- Manual / offline payment entry (the `+ Record Payment` button stays a stub; it
  needs an INSERT path that RLS deliberately does not have).
- Refunds, disputes, failed or async Stripe events. Only
  `checkout.session.completed` → `succeeded`, as today.
- Correcting the existing production rows — they are test attempts, left as they are.
- **Currency conversion.** Cross-currency payments are excluded from the balance
  and surfaced, never converted (§3.6).
- Migrating `PayInvoiceTab`'s manual `useEffect` + `fetch` to SWR — a real
  `client-swr-dedup` violation, but a separate ticket.
- Any change to how `contractTotalCents` is computed
  ([QuoteDetailView.tsx:121](../../src/features/quotesAndBookings/components/quoteDetail/QuoteDetailView.tsx)).

---

## 2. Current behavior (baseline)

| Consumer                       | Money received is computed as                                                                                                            | Wrong when                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `BillingTab` — Payment Summary | Σ `amount_cents` of installments with `status='paid'`                                                                                    | any partial payment; any payment without a schedule                                                                            |
| `BillingTab` — Payment History | installments with `status='paid'`, re-rendered                                                                                           | same; shows nominals, never actual amounts                                                                                     |
| `PayInvoiceTab` (public)       | Σ `amount_cents` of `succeeded` `PaymentHistory` rows                                                                                    | total is right, but the schedule table renders the wrong per-row status, and `overdueCents` subtracts a targeted payment twice |
| Quote document + PDF           | `p.status` straight from the installment row ([QuotePdfDocument.tsx:343](../../src/features/quotesAndBookings/pdf/QuotePdfDocument.tsx)) | same — a client receives a **document** stating a $3600 installment is "paid" for $1                                           |
| Webhook                        | sets `status='paid'` on `metadata.installmentId`, unconditionally                                                                        | always, for any amount ≠ nominal                                                                                               |

---

## 3. Architecture

### 3.1 The allocation function (new, pure, shared)

New module: `src/features/quotesAndBookings/utils/allocatePayments.ts`
(`utils/` is where this feature keeps its pure logic — `buildDefaultPaymentSchedule`,
`calculateTotals`, `eventAmounts`. No new folder.)

```ts
export type AllocatablePayment = {
  id: string;
  installmentId: string | null;
  amountCents: number;
  currency: string;
  status: string; // only "succeeded" is counted
  paidAt: string | null;
  createdAt: string;
};

export type AllocatableInstallment = {
  id: string;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
};

export type InstallmentAllocation = {
  installmentId: string;
  dueDate: string;
  amountCents: number; // nominal
  allocatedCents: number; // actually covered
  status: "unpaid" | "partial" | "paid";
  paidAt: string | null; // completing payment's timestamp; null unless status === "paid"
};

/** Where one payment's money actually went, after allocation. */
export type PaymentAllocation = {
  paymentId: string;
  parts: { installmentId: string; cents: number }[];
  unallocatedCents: number; // this payment's share of the leftover
  excluded: null | "currency" | "status"; // why it was not counted at all
};

export type Allocation = {
  installments: InstallmentAllocation[];
  byPayment: PaymentAllocation[];
  totalReceivedCents: number; // Σ counted payments — the money question
  allocatedCents: number;
  unallocatedCents: number; // received beyond what the schedule can absorb
  foreignCurrencyPayments: { paymentId: string; currency: string; amountCents: number }[];
};

export function allocatePayments(
  installments: readonly AllocatableInstallment[],
  payments: readonly AllocatablePayment[],
  eventCurrency: string,
): Allocation;
```

**Canonical payment order (Q1).** Before allocating, payments are sorted with
`toSorted()` by, in order:

1. **effective time** = `paidAt ?? createdAt`, ascending;
2. `createdAt`, ascending;
3. `id`, ascending (final tiebreak — guarantees a total order).

Timestamps are compared as **parsed epoch milliseconds**, not as strings: rows reach
us from PostgREST (`2026-08-13T19:00:40.247+00:00`) and from the PowerSync local DB
(`2026-08-13 19:00:40.247+00`), and those two formats do not sort correctly against
each other lexicographically. An unparseable timestamp sorts last, then by `id`.

Money is allocated **oldest payment first**, so the earliest money fills the earliest
installment. This makes the result independent of row order out of the DB.

Rules, in order:

1. **Counted payments** are those with `status === "succeeded"` **and**
   `currency === eventCurrency` (§3.6). Everything else appears in `byPayment` with
   `excluded` set and contributes nothing to any total.
2. **Targeted first.** A payment whose non-empty `installmentId` matches a known
   installment is applied to that installment, capped at its remaining balance.
3. **Overflow spills (Q3).** A targeted payment larger than its installment's
   remaining balance fills that installment and the excess flows into step 4.
   `$1,000` installment + `$1,500` targeted payment → `$1,000` to that installment,
   `$500` FIFO onto the following ones, then `unallocatedCents`.
4. **FIFO for the rest.** Remaining money (untargeted payments, spill, and payments
   whose `installmentId` no longer resolves) fills installments ordered by `dueDate`
   ascending, then `id`, each to its nominal before moving on.
5. Leftover becomes `unallocatedCents`. It is never lost and always counts toward
   `totalReceivedCents`.
6. `status` is `paid` when `allocatedCents >= amountCents`, `partial` when
   `0 < allocatedCents < amountCents`, else `unpaid`.
7. **`paidAt` invariant (Q2).** `paidAt` is non-null **if and only if** status is
   `paid`, and it is the effective time of the payment that completed it (the last
   one applied). A recomputation that drops an installment out of `paid` sets
   `paidAt` back to `null`. A lingering `paid_at` on an unpaid row is exactly the
   kind of half-truth this spec exists to remove — and since 2026-09-03 it cannot
   linger anywhere but in memory: `paidAt` lives only in the allocation result,
   the stored column is gone (§3.2).

Deterministic and side-effect free: same inputs → same output, no clock, no I/O.
Both input arrays are `readonly` and sorted with `toSorted()`
(`js-tosorted-immutable`) — the caller's arrays come from memoized hooks, so
sorting in place would corrupt shared state and silently break memoization.

### 3.2 Webhook

> **Superseded 2026-09-03: there is no write-back step.** The reconcile described
> below shipped, then went away with the columns it maintained — the webhook now
> performs the `PaymentHistory` insert and nothing else
> ([route.ts](../../src/app/api/stripe/webhook/route.ts)). The properties this
> section argued for still hold, more cheaply: a single idempotent insert, guarded
> by a unique constraint on `stripe_checkout_session_id`, cannot leave a wrong row
> behind for a later delivery to heal. Kept for the reasoning; see §3.7 and
> [payment-does-not-invalidate-signature.md](./payment-does-not-invalidate-signature.md).

[`src/app/api/stripe/webhook/route.ts`](../../src/app/api/stripe/webhook/route.ts):
the insert into `PaymentHistory` is unchanged. The unconditional update is replaced by:

1. Read the event's `PaymentInstallments` and its `PaymentHistory` rows **in one
   `Promise.all`** — they are independent (`async-parallel`).
2. Run `allocatePayments` with the event's currency.
3. Write back `status` / `paid_at` (including `paid_at = null`, per Q2) only for
   installments whose stored values disagree (`js-early-exit` — no write when
   nothing changed, the common redelivery case).

Idempotent — a redelivered webhook recomputes the same state — and it self-heals
rows an earlier delivery got wrong. Failures stay non-fatal and logged: the money is
recorded, Stripe must not retry, and read-time allocation keeps every screen correct.

### 3.3 Reads — and a blocking pre-check

| Consumer                             | Source                                                                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `BillingTab`                         | new `usePaymentHistory(eventId)` — reactive PowerSync query, combined with `usePaymentInstallments` through `allocatePayments`                |
| `PayInvoiceTab`, quote document, PDF | existing `GET /api/payments/history` (or the same server read inside `quoteDocumentData`) + the schedule, through the same `allocatePayments` |

`PaymentHistory` exists in [AppSchema.ts:949](../../src/lib/powersync/AppSchema.ts)
with an `event_uuid` index, and `20260805120000_payment_history_rls.sql` grants
SELECT to `admin`, `account_manager`, `viewer`.

**Open risk — resolved by T0 before any UI work.** PowerSync sync rules live in
PowerSync Cloud and are **not in this repository**, so nothing here proves
`PaymentHistory` is synced to clients. If it is not in the bucket definitions,
`usePaymentHistory` returns `[]` and Billing reports `$0` — Bug 2's symptom with a
new cause.

**T0 pass criteria (Q12).** Not "it looks fine":

1. In PowerSync Cloud, confirm `PaymentHistory` appears in the deployed sync rules
   for the staff bucket. Paste the relevant rule block into this section.
2. With the app running as an admin, on event `4b405a0a` (which has a payment), run
   in the browser console against the local DB:
   `await db.selectFrom("PaymentHistory").select(...).where("event_uuid","=","4b405a0a-…").execute()`
   and compare the row count and `amount_cents` sum with the same query in Supabase.
   **Pass = identical counts and identical sums.** An empty local result is a fail.
3. Repeat once after a hard reload with the local DB cleared, to prove it is a sync
   rule and not a cache artefact.

If it fails, choose: **(a)** add the table to the sync rules (preferred — the RLS
policy was written for this and payment volume is tiny), or **(b)** have `BillingTab`
read `GET /api/payments/history`, the documented online-only exception in
[POWERSYNC_ARCHITECTURE.md](../POWERSYNC_ARCHITECTURE.md). Record the outcome here.

`allocatePayments` is unaffected by that choice — the point of keeping it pure.

### 3.4 Rejected alternatives

- **Adding `'partial'` to `PaymentInstallmentStatus`** (the DB/type union). It would
  widen a type used across quote creation, the PDF, and the public document
  ([quoteTypes.ts:55](../../src/features/quotesAndBookings/types/quoteTypes.ts)), and
  every existing `status !== "paid"` check would keep compiling while meaning
  something new. `partial` exists only in the **allocation result** (§3.1), which is
  a separate type, and is rendered from there.
- **A Postgres trigger / generated column.** Invisible to the PowerSync local DB and
  untestable from Vitest.
- **Allocating at write time only.** Leaves historical rows wrong forever and gives
  no answer when the schedule is edited after payment.

### 3.5 Performance constraints (part of the contract)

- **Single pass** over payments and over installments; replaces the three separate
  `filter`/`reduce` passes in `BillingTab` (`js-combine-iterations`).
- **`Map`, not `find`**, for targeted lookup, built once (`js-index-maps`) —
  otherwise O(payments × installments).
- **`useMemo` at every call site** keyed on the two arrays (`rerender-memo`);
  `usePaymentHistory` must return a `useMemo`-stable array or the memo is defeated.
- **Derived during render** — no `useState` + `useEffect` mirror
  (`rerender-derived-state-no-effect`).
- **No new client dependencies.**

### 3.6 Currency rule (Q9, Q10) — exact

Allocation takes the **event currency** and is strictly single-currency:

| Quote | Payment               | Counted in `totalReceivedCents` | Affects Balance Due | Shown                                                |
| ----- | --------------------- | ------------------------------- | ------------------- | ---------------------------------------------------- |
| USD   | USD                   | yes                             | yes                 | normally                                             |
| CAD   | CAD                   | yes                             | yes                 | normally                                             |
| USD   | CAD (or any mismatch) | **no**                          | **no**              | in Payment History, flagged, and in a warning banner |

**A payment in the wrong currency never reduces a balance in another currency.**
Subtracting CAD cents from a USD total is a silent FX error, and it is worse than
showing a discrepancy, because it looks correct. Such payments land in
`foreignCurrencyPayments` with `excluded: "currency"`, are listed in the Payment
History table with their own currency symbol and a warning marker, and the Billing
tab shows a banner: _"1 payment in CAD is not included in this balance. Reconcile it
manually."_

**Where the currency comes from (corrected).** An earlier revision of this section
claimed a mismatch was "unreachable today, because `create-checkout` takes the
currency from the quote". That was wrong: the endpoint read `currency` straight
out of the request body and fell back to `"USD"`, and `/quote/[id]` is
unauthenticated — so anyone able to reach the public quote page could name the
currency (and the amount) a Checkout session was created in.

`POST /api/payments/create-checkout` now resolves both server-side, and ignores
the body entirely for these two fields:

| Field      | Source of truth                                                                              |
| ---------- | -------------------------------------------------------------------------------------------- |
| `currency` | event -> `SalesOffices` -> `resolveOfficeCurrency(QboConnections.currency, office province)` |
| ceiling    | `remainingCents` from `computeAmountDue(allocatePayments(...))` over the event's own rows    |

A request below $0.50, above the outstanding balance, non-integer, or against an
invoice already paid in full is rejected with `400` and a message the payer can
act on. The reader is
[`server/eventPaymentContext.ts`](../../src/features/quotesAndBookings/server/eventPaymentContext.ts);
`PayInvoiceTab` no longer sends `currency` at all.

Conversion (rates, rounding, an FX audit trail) remains out of scope and would
need its own spec.

**One currency source (done).** The sales office is now the single answer to
"what is this quote priced in", on every surface:

| Surface                                                 | Resolves through                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| Quote list, quote detail, Billing, Contract, create     | `useEventCurrency` -> `useOfficeCurrencies` -> `resolveOfficeCurrency` |
| Public quote, PDF, quote email (`quoteDocumentData`)    | `resolveEventCurrency` (server, same rule)                             |
| Checkout session (`create-checkout`)                    | `loadEventPaymentContext`                                              |
| Sales-office picker on create/edit (`salesOfficeLabel`) | `useSalesOffices` -> `useOfficeCurrencies` -> `resolveOfficeCurrency`  |

> **Amended 2026-09-03.** Two rows moved. The webhook resolved a currency only to
> feed the reconcile, and both are gone. The office picker is new to the table but
> was always a currency surface: it re-derived `(CAD)` / `(USD)` from the address
> province — the _fallback_ half of `resolveOfficeCurrency` — so Ontario Office,
> which carries no province and takes CAD from its QuickBooks connection, was
> offered as USD while the quote it produced was priced, invoiced and charged in
> CAD. The rule is the one this section states: a label follows the resolution,
> never the address.

`EventLineItems.currency` and `PaymentInstallments.currency` are now read as
what they always were — a copy written when the quote was priced — and serve
only as a fallback where the office cannot be read. The one remaining place that
still assumes a bare "$" is the quote-list search haystack
([searchEvents.ts](../../src/features/quotesAndBookings/utils/searchEvents.ts)),
which is text matching, not display.

**Display rule.** USD renders exactly as it always has (`$1,234.56`). CAD is
marked — `C$1,234.56` in English, `1 234,56 $ CA` in French — because an
unmarked Canadian amount sitting next to an American one in a list is a
30-odd-percent difference that nobody can see. `formatMoney` / `formatCurrency`
(internal screens) and `formatQuoteMoney` (client-facing) are the only two
implementations, and column totals in the quote list are summed per currency
rather than added together.

**Settled (owner's call, 2026-09-03): a quote is never frozen in the currency it
was written in.** An office whose QuickBooks connection changes currency also
changes the currency of the quotes it has already issued — displayed and charged
together. The office is the truth at read time, not at write time, and nobody has
to remember which quote was priced when. An office changing currency is a
once-ever event for a franchise location, so re-pricing existing quotes is the
cheaper of the two wrong answers.

### 3.7 `PaymentInstallments.status` is a derived cache (Q8) — binding

> **Superseded 2026-09-03: the columns are gone.** `status` and `paid_at` were dropped
> from `PaymentInstallments`, and the webhook's reconcile step with them. A cache no
> caller may read is not worth keeping correct, and writing it made a paid quote look
> edited to the hash guarding the contract signature. The rule below now holds by
> construction — there is nothing left to read. See
> [payment-does-not-invalidate-signature.md](./payment-does-not-invalidate-signature.md).

**Rule: no financial calculation may read `PaymentInstallments.status` directly.**
The only permitted readers are (a) the webhook, when comparing before a write, and
(b) diagnostics. Everything user-facing derives status from `allocatePayments`.

Call sites to migrate as part of this task:

| Call site                                                    | Today                        | After                                      |
| ------------------------------------------------------------ | ---------------------------- | ------------------------------------------ |
| `BillingTab` summary / schedule / history                    | reads `status`               | allocation                                 |
| `PayInvoiceTab` `paidCents`, `overdueCents`, schedule badges | reads `status`               | allocation                                 |
| **`QuotePdfDocument.tsx:343` + `statusLabel`**               | reads `status`               | allocation                                 |
| `QuotePublicView` schedule                                   | reads `status`               | allocation                                 |
| `quoteDocumentData.paymentSchedule`                          | passes `status` through      | carries `allocatedCents` + derived status  |
| `fetchPaymentInstallments`, `syncPaymentInstallments`        | write/read `status`          | stopped touching it — the columns are gone |
| `buildDefaultPaymentSchedule`, `EditPaymentScheduleModal`    | write `"unpaid"` on new rows | unchanged                                  |

The PDF is the sharpest case: it is a document sent to a client, and today it can
state that a $3,600 installment is "paid" because $1 arrived. `quoteStrings` needs a
`statusPartial` entry (`en: "partial"`, `fr: "partiel"`) for `statusLabel`.

> **The reader this table missed (2026-09-03).** `buildQuoteDocumentData` selects
> its installments with a raw PostgREST string that named `status` among the
> columns. A string is invisible to `tsc`, so dropping the column
> did not break the build — it broke the request at runtime, the installments came
> back `null`, and the Pay tab, which renders its schedule only when it has one,
> silently stopped showing the client what they had agreed to pay and when. When
> a column leaves, grep the raw selects; the type checker will not. Covered now by
> an e2e that reads the schedule off the rendered public page.

### 3.8 Concurrency (Q11)

Two `checkout.session.completed` deliveries for the **same** event can be processed
simultaneously (two people paying two installments; or a delivery plus a retry of a
different session).

- **Inserts are safe.** The partial unique index on `stripe_checkout_session_id`
  plus the existing `23505` handling make double-recording impossible. No money is
  ever counted twice. This is the part that must be race-proof, and it already is.
- **Reconciles can interleave.** Both may read before either writes, so the loser can
  write a slightly stale `status`. The damage is bounded: a _cache_ row is briefly
  stale. It self-corrects on the next payment or webhook redelivery.

  > **Retired 2026-09-03.** With the cache columns dropped, the webhook performs a single
  > insert and no reconcile, so there is no second write left to interleave.

- **Decision: eventual consistency is sufficient, and no transaction is added.**
  This is only acceptable _because_ of §3.7 — every screen recomputes from
  `PaymentHistory` at read time, so a stale cache row cannot produce a wrong number
  for a user. Were `status` ever made authoritative again, this decision must be
  revisited and the reconcile wrapped in a transaction with
  `SELECT … FOR UPDATE` on the event's installments (or a
  `pg_advisory_xact_lock(hashtext(event_uuid))`).
- Recorded as a known limitation rather than silently accepted.

---

## 4. Data / Schema

### 4.1 An installment with money cannot be deleted (decision)

The foreign key `PaymentHistory.installment_id → PaymentInstallments(id)` stays
**restrictive**. Deleting an installment that a payment points at is refused by
the database, and that is the intended behaviour: money that arrived against a
scheduled payment is an accounting fact, and quietly moving it to a different
installment because someone rearranged the schedule is not a UI convenience —
it changes what the payment means, months later, with no record that it changed.

Consequence for the UI: removing such an installment must be **blocked before the
write**, not caught after it. The delete is issued against the local PowerSync DB
and only fails on upload, where a rejection stalls the upload queue instead of
showing an error. `syncPaymentInstallments` therefore refuses up front, naming
the amount:

> "Aug 31 has $1,000.00 in payments against it and cannot be removed. Refund or
> reassign the payment first."

Rebuilding the schedule of a paid quote is deliberately a two-step act.

### 4.2 The original target is kept forever (decision)

One migration:

```sql
-- <timestamp>_payment_history_intended_installment.sql
alter table public."PaymentHistory"
  add column if not exists intended_installment_id uuid;

-- What the client aimed at, at the moment they paid. Deliberately NO foreign
-- key and never nulled: it is a historical fact, not a live link.
update public."PaymentHistory"
   set intended_installment_id = installment_id
 where intended_installment_id is null;
```

`installment_id` remains the live link the allocation reads.
`intended_installment_id` answers "what did the client actually pay for", even if
the schedule is rebuilt around it. The webhook populates both on insert; nothing
ever clears the second one. (Stripe's session metadata holds the same fact, but
an accounting answer should not require opening the Stripe dashboard.)

Column added → `npm run gtl` and an `AppSchema.ts` entry for the new column.

### 4.3 `syncPaymentInstallments` stops deleting what it is only editing

Today it deletes every installment of the event and re-inserts the set — even
when the user changed one date. The ids are preserved by the modal, so the rows
come back identical, but the delete still fires, and with §4.1 in force it would
now be refused for any paid quote. Replace it with a diff:

| Case                          | Action                                                                      |
| ----------------------------- | --------------------------------------------------------------------------- |
| in the new set, not in the DB | `INSERT`                                                                    |
| in both                       | `UPDATE` `due_date` / `amount_cents` only — **never** `status` or `paid_at` |
| in the DB, not in the new set | `DELETE`, refused up front if payments reference it (§4.1)                  |

This also fixes a quieter bug: the current insert writes `paid_at: null`
unconditionally, so every quote edit wipes the payment cache. Harmless since
rev. 1 (every screen recomputes), but it should stop happening.

## 5. TypeScript contracts (locked)

Beyond §3.1:

```ts
// src/features/quotesAndBookings/hooks/usePaymentHistory.ts
export type PaymentHistoryRow = {
  id: string;
  installmentId: string | null;
  amountCents: number;
  currency: string;
  status: string;
  paymentMethodType: string | null;
  payerName: string;
  payerEmail: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
  createdAt: string;
};

export function usePaymentHistory(eventId: string | null): {
  payments: PaymentHistoryRow[];
  isLoading: boolean;
  error: unknown;
};
```

Kysely → `.compile()` → `useTypedQuery(compiled, expect<Row>())`, per
[POWERSYNC_ARCHITECTURE.md](../POWERSYNC_ARCHITECTURE.md), mirroring
`usePaymentInstallments`. The returned array is `useMemo`-stable (§3.5).

`quoteDocumentData.paymentSchedule` items gain `allocatedCents: number` and
`status: "unpaid" | "partial" | "paid"` (document-level type, not the DB union).
`quoteStrings` gains `statusPartial`. `BillingTab` props are unchanged.

---

## 6. UI behavior

### 6.1 BillingTab — Payment Summary

- `Payments Received` = `allocation.totalReceivedCents`.
- `Balance Due` = `contractTotalCents - totalReceivedCents`, floored at 0; if it
  would be negative, show `$0.00` plus "Overpaid by X".
- Foreign-currency banner when `foreignCurrencyPayments` is non-empty (§3.6).

### 6.2 BillingTab — Payment Schedule

Nominal, allocated amount when partial, and a three-state badge: `Paid` (green) /
`Partial` (amber, "$1.00 of $3,600.00") / `Unpaid`. Totals come from the allocation.

### 6.3 BillingTab — Payment History (Q6)

Real `PaymentHistory` rows, newest first: date (`paid_at`), amount, payer name,
method, **Applied to**, and a receipt link when present.

**"Applied to" shows the current allocation, not the stored `installment_id`.**
It is the only honest answer to "where is this money now", and after a schedule
rewrite the stored id may point at a row that no longer exists. Rendered from
`byPayment`:

- one part → `Due Sep 16, 2026`;
- several parts → `Due Aug 31 ($1,000.00) · Due Sep 16 ($500.00)` (a payment can
  legitimately span installments, per §3.1 rule 3);
- nothing allocated → `Unapplied`;
- excluded → `Not counted (CAD)`.

The raw `installment_id` stays in the database as the record of intent; it is not
shown, because a stale intent next to a live allocation is exactly the kind of
two-numbers-one-question problem this spec removes.

`+ Record Payment` becomes **disabled** with a title saying manual entry is not
available yet — today it is a live-looking button with no handler.

### 6.4 PayInvoiceTab, quote document, PDF

`paidCents` comes from the shared function. Schedule tables and the PDF gain the
three-state badge, so a client who paid $1 against a $3,600 installment stops
receiving a document that calls it paid. `overdueCents` subtracts allocated amounts
per installment instead of one global `paidCents`, removing the existing
double-subtraction when a targeted payment exists.

> **Shipped as `overdueOwedCents`, and the client never reads the word (2026-09-03).**
> The figure covers every installment whose due date has _arrived_, which includes
> today's. Calling that "overdue" on the morning it falls due accuses a customer of
> being late when they are not, so the copy says "Due" / "À payer"
> (`quoteStrings.due`, `dueNoticeSuffix`) and a guard test keeps the old wording out
> of the dictionary. The field name still says overdue; the badge does not.

---

## 7. Scenarios

| #            | Given                                    | When                                                      | Then                                                                                           |
| ------------ | ---------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| S1           | schedule 2 × $2700                       | client pays $1 on installment 1                           | installment 1 = `Partial $1.00 of $2,700.00`; Received = $1.00; Balance Due = total − $1.00    |
| S2           | no schedule                              | client pays $2                                            | Received = $2.00; Balance Due = total − $2.00; history shows the row                           |
| S3           | schedule 2 × $2700                       | pays $2700 on installment 1                               | installment 1 `Paid` (with `paidAt`); installment 2 `Unpaid`                                   |
| S4           | schedule 2 × $2700                       | pays $4000 untargeted                                     | installment 1 `Paid`, installment 2 `Partial $1300`                                            |
| S5           | schedule 1 × $2700, paid                 | webhook redelivers the same session                       | no duplicate row, no state change, **no write**                                                |
| S6           | contract $5000, payments $6000           | —                                                         | Balance Due `$0.00`, "Overpaid by $1,000.00"                                                   |
| S7           | payment targets a deleted installment id | —                                                         | counted, re-allocated FIFO, nothing thrown                                                     |
| **S8** (Q4)  | installment $1000                        | two payments $400 then $600                               | `Paid`; `paidAt` = the **$600** payment's time                                                 |
| **S9** (Q13) | schedule $1000 + $1000                   | $1000 targeted at installment **2**, then $600 untargeted | installment 2 `Paid`; installment 1 `Partial $600`; targeting is respected over due-date order |
| **S10** (Q3) | installment $1000                        | $1500 targeted at it, second installment $1000            | installment 1 `Paid`, installment 2 `Partial $500`                                             |
| **S11** (Q2) | installment $1000 marked `paid` in DB    | schedule edited so the installment is now $2000           | recompute → `Partial`, and stored `paid_at` is **cleared**                                     |
| **S12** (Q9) | USD quote, schedule $1000                | a CAD $1000 payment                                       | Received `$0.00`; Balance Due unchanged; banner + `Not counted (CAD)` row                      |

---

## 8. Edge cases

- **E1 — untargeted overflow.** Beyond the schedule → `unallocatedCents`, surfaced,
  never dropped.
- **E2 — dangling `installment_id`.** Treated as untargeted (S7).
- **E3 — non-`succeeded` rows.** Excluded from money, still listed with their status.
- **E4 — currency mismatch.** Fully specified in §3.6 / S12: excluded from every
  total, never converted, always visible.
- **E5 — schedule edited after payment (Q5, Q7). Now in scope.** Two halves:
  1. **The crash:** `syncPaymentInstallments` deletes and re-inserts every
     installment; the FK had no `ON DELETE`, so deleting a referenced installment
     raised a violation — and because the delete originates in the local DB, it
     surfaced as a stuck PowerSync upload, not an error message. Fixed by the
     migration in §4.
  2. **The money:** `installment_id` becomes `NULL`, the payment turns untargeted,
     and FIFO re-allocation puts it on the earliest installment of the new schedule.
     Nothing is lost; `totalReceivedCents` is unchanged across the edit. Covered by
     S11.
- **E6 — PowerSync offline.** Allocation runs over whatever is local; no new spinner.
- **E7 — webhook reconciliation fails.** Logged, non-fatal, 200. Read-time allocation
  keeps the UI right.
- **E8 — sync gap guard.** If an event has installments marked `paid` but zero
  `PaymentHistory` rows, `BillingTab` shows "Payment data unavailable" instead of
  `$0.00 received`. This is the T0 failure mode reaching a user (a sync rule removed
  later, a bucket the user is not in); reporting zero money would be a confident lie,
  so the UI declines to answer instead.

---

## 9. Permissions

No change in who may do what. Reading payment data on the Billing tab follows the
existing `PaymentHistory` SELECT policy (`admin`, `account_manager`, `viewer`);
`developer` and `driver` cannot reach the page at all.

Add one entry to
[`permissionPageData.ts`](../../src/features/userAccess/permissionPageData.ts),
category "Day to Day Operations", next to "QuickBooks Invoice Flag":

| Role            | Level | Note                                                                                                                   |
| --------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| admin           | read  | Can see every payment, amounts and receipts, on any quote. Recording a payment by hand is not available to anyone yet. |
| account_manager | read  | Same view as an administrator, on every quote.                                                                         |
| viewer          | read  | Can see payments but change nothing.                                                                                   |
| developer       | none  | No access to quotes.                                                                                                   |
| driver          | none  | Driver mobile app only.                                                                                                |

`read` for all three staff roles because nobody can write payments from the UI —
writes come only from the Stripe webhook via the service role.

---

## 10. TDD plan (implementation order)

Strictly red → green → refactor. Each task starts with a failing test.

**T0 — pre-check, not a test.** Run the §3.3 procedure and write the outcome into
§3.3 before T3 begins.

**T1 — `allocatePayments`.** `utils/allocatePayments.test.ts`, written first, all
failing:

- S1–S12 as direct unit cases. S1 and S2 are Bug 1 and Bug 2 — red before the fix,
  green after.
- Empty + empty; empty installments with payments (Bug 2 shape).
- Zero-amount installment (no divide, no infinite loop).
- Payment exactly equal to the nominal → `paid`, not `partial`.
- `pending` / `failed` excluded from `totalReceivedCents`.
- **Order independence:** shuffled input arrays produce identical output.
- **Timestamp formats:** PostgREST `…T19:00:40.247+00:00` and PowerSync
  `… 19:00:40.247+00` sort identically; an unparseable timestamp sorts last.
- **`paidAt` invariant:** every non-`paid` installment has `paidAt === null`.
- **Purity:** both input arrays deep-equal before and after the call.
- **Conservation:** `allocatedCents + unallocatedCents === totalReceivedCents`, as a
  property-style assertion across the whole scenario table.

Implement to green, then refactor to §3.5 (single pass, Map lookup) with tests green.

**T2 — webhook.** Extend
[route.test.ts](../../src/app/api/stripe/webhook/route.test.ts), red first: $1 vs
$2700 leaves `unpaid` (Bug 1); a full payment sets `paid` + `paid_at`; a
recomputation that un-pays clears `paid_at` (S11); a redelivery issues **no**
installment write; a reconciliation error still returns 200.

**T3 — `usePaymentHistory` + `BillingTab`.** Component tests first: Bug 2 shape,
Bug 1 shape, overpayment, multi-part "Applied to" (§6.3), foreign-currency banner,
E8 guard.

**T4 — `PayInvoiceTab`, `QuotePublicView`, `QuotePdfDocument`.** Badge states,
`statusPartial` strings in both languages, and the `overdueCents` double-subtraction.

**T5 — migration + `syncPaymentInstallments`** (§4): a test that editing the schedule
of an event with a payment succeeds and preserves `totalReceivedCents`.

**T6 — `permissionPageData.ts`** entry (§9), same commit as T3.

### Playwright — SKIPPED, with reason

Reachable only through a real Stripe Checkout redirect and a signed webhook, and
`PaymentHistory` is empty in `seed.sql` — no seeded payment to assert on. Adding a
payment fixture is out of scope. To be stated explicitly in the final report, never
passed off as run.

---

## 11. Definition of Done

- [ ] T0 answered and written into §3.3
- [ ] `npm run tc`
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run gtl` + `AppSchema.ts` column after the §4.2 migration
- [ ] `npm run test:e2e` — SKIPPED (§10), reason stated in the report
- [ ] `permissionPageData.ts` updated in the same commit
