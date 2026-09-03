# Spec: Manual Payment Entry — `+ Record Payment`

Status: **APPROVED (rev. 2.1)** — approved 2026-09-03; implementation in progress
Owner: quotesAndBookings / payments
Routes affected:

- Staff: `/quotes-bookings/[id]?tab=billing` (the `+ Record Payment` button)
- Server: `/api/stripe/webhook` (§4.5)

Depends on: [payment-accounting-truth.md](./payment-accounting-truth.md) — **shipped**
Related: [payment-history-security.md](./payment-history-security.md),
[payment-does-not-invalidate-signature.md](./payment-does-not-invalidate-signature.md)

> **Rev. 2 (2026-09-03) — rewritten against the code that actually shipped.**
> Rev. 1 was written before its dependency landed and guessed wrong about the shape
> it would land in. `payment-accounting-truth` is now **Implemented (rev. 4)**, and
> four of its decisions change this spec materially:
>
> 1. **`allocatePayments` does not "assume" non-negative amounts — it clamps them
>    to zero** in three places, and defines `totalReceivedCents` as
>    `allocated + unallocated` rather than as the sum of amounts. Supporting
>    negatives is therefore **not** the additive extension rev. 1 promised: it
>    reopens the two-pass core and redefines the module's headline output (§3.3).
>    This is the one change here that needs a fresh decision, not just a fresh
>    read.
> 2. The allocator's return type gained a **per-payment breakdown** (`byPayment`)
>    that the Billing tab already renders. Rev. 1 never said what it means for a
>    negative row; §3.4 now locks that (signed parts).
> 3. `PaymentHistory` gained **`intended_installment_id`** — the historical target,
>    never re-pointed. Manual entry must write it (§4.2, §5).
> 4. `PaymentInstallments.status` / `paid_at` were **dropped from the database**.
>    Rev. 1's sequencing fallback (its §11) described a world that no longer
>    exists and has been deleted.
>
> Rev. 1's design intent is unchanged and still correct: an append-only ledger, a
> signed integer, corrections as offsetting rows.
>
> **Rev. 2.1 (2026-09-03) — lead AM access, owner's call.** A lead account manager
> may record a payment on any quote, not only their own. This turned out to need no
> new logic: `canEditOwnedEntity` already returns true for a lead in any zone, and
> the Billing tab already receives that answer as `canEdit`. What was wrong was this
> spec, which described the rule as "their own quotes". Corrected in §6.1, §7 (S8
> split, S13 added), §9 and §10 — including the discovery that the `am` Playwright
> project runs as a **lead**, so it tests S13 rather than S8.

---

## 1. Summary

Accounting takes money that never touches Stripe — a check in the mail, an ACH
transfer, a card run manually on a terminal — and it currently has nowhere to go.
The `+ Record Payment` button on the Billing tab
([BillingTab.tsx:309](../../src/features/quotesAndBookings/components/quoteDetail/tabs/BillingTab.tsx))
is rendered `disabled`, with a title saying manual entry is not available yet —
the honest interim state that `payment-accounting-truth` §6.3 asked for, and which
this spec supersedes by making the button work.

This spec gives it a dialog, and gives `PaymentHistory` its first client write
path, with one property that shapes everything else: **an amount may be negative.**

Negative is not a curiosity. It is how accounting expresses a refund, a bounced
check, a chargeback, and a correction of their own typo. Because payments are an
append-only ledger (§3.2), a negative row is the _only_ way to undo anything — so
"handles negative values" is the mechanism this feature runs on, not a validation
relaxation bolted onto it.

### Payment types

| Type               | Stored `payment_method_type` | `entry_source` | Entered by                                 |
| ------------------ | ---------------------------- | -------------- | ------------------------------------------ |
| Stripe             | `stripe`                     | `stripe`       | the webhook, automatically — never by hand |
| Manual Credit Card | `manual_credit_card`         | `manual`       | accounting, in the dialog                  |
| ACH Payment        | `ach`                        | `manual`       | accounting, in the dialog                  |
| Check              | `check`                      | `manual`       | accounting, in the dialog                  |

Stripe is a _fourth peer in the same ledger_, not a separate table: the Billing tab
lists all four together, and the totals do not care where a row came from.

### Goals

1. Accounting can record a payment of any of the three manual types against a quote
   or booking, applied to a chosen installment or to none.
2. Amounts may be **negative** end to end — input, validation, storage, allocation,
   per-payment breakdown, totals, display — with a defined meaning at each step.
3. The ledger is append-only and attributable: who entered a row, when, and against
   what reference (check number, ACH trace, terminal auth code).
4. Stripe rows stay untouchable from the UI, and stay distinguishable from
   hand-entered ones.
5. Manual rows flow through the same `allocatePayments` as Stripe rows, so no
   consumer can disagree about the balance.

### Non-goals (this iteration)

- **Editing or deleting a payment row.** Corrections are offsetting negative rows
  (§3.2). This is deliberate and is the reason negatives must work properly.
- **A `pending` state for ACH.** Manual rows are recorded as `succeeded` at the
  moment accounting enters them; a transfer that later fails is a negative row.
  A real pending→settled lifecycle is a separate ticket (E7).
- **Pushing anything back to Stripe.** Recording a manual refund here does not
  issue a Stripe refund, and the dialog says so.
- Multi-currency entry. The dialog writes the event's currency, not a picker — and
  since rev. 3 of the dependency this is a correctness requirement, not a
  simplification (E5).
- Attachments (a scan of the check). Separate ticket.
- Changing `contractTotalCents`, the payment schedule editor, or the public
  `/quote/[eventUUID]` page. Manual rows reach the public totals automatically
  through `allocatePayments`; nothing there changes shape.

---

## 2. Current behavior (baseline, verified at `740fbcf`)

- The `+ Record Payment` button is **disabled**, with the title _"Recording a
  payment by hand isn't available yet — payments arrive from Stripe."_ There is no
  handler and nothing to write to.
- `PaymentHistory` RLS grants **SELECT only**, to `admin` / `account_manager` /
  `viewer`. There is no INSERT policy for `authenticated`, by design
  ([20260805120000_payment_history_rls.sql](../../supabase/migrations/20260805120000_payment_history_rls.sql)) —
  every existing row is written by the service role from the webhook.
- `amount_cents integer not null` has **no** check constraint, so negatives are
  already storable. Nothing downstream reads them correctly (§3.3).
- `payment_method_type` holds whatever Stripe reported —
  `session.payment_method_types?.[0] ?? "card"`
  ([route.ts:127](../../src/app/api/stripe/webhook/route.ts)), i.e. `"card"` for
  every production row today. The Billing tab prints that value **raw** next to the
  payer name, so it is already user-visible.
- `PaymentInstallments` no longer carries `status` or `paid_at`
  ([20260903130000](../../supabase/migrations/20260903130000_drop_payment_installment_cache_columns.sql)).
  Every screen derives payment state from `allocatePayments` over `PaymentHistory`.

---

## 3. Architecture

### 3.1 Write path — local-first, RLS-gated

Manual entry is a normal app write, so it follows
[POWERSYNC_ARCHITECTURE.md](../POWERSYNC_ARCHITECTURE.md): Kysely → `.compile()` →
`typedExecute`, into the local `PaymentHistory` table — the same shape as
[`db/paymentInstallments.ts`](../../src/features/quotesAndBookings/db/paymentInstallments.ts).
PowerSync's upload connector
([BackendConnector.ts:71](../../src/lib/powersync/BackendConnector.ts)) replays the
insert to PostgREST under the user's Clerk JWT, so **the RLS INSERT policy is the
authorization boundary** — not the dialog, and not the button's `disabled` prop.

Why not an API route with the service role (the webhook's path)? Because that
bypasses RLS, needs its own hand-rolled role check, breaks offline entry, and makes
the new row appear only after a round trip and a refetch. The local-first write is
reactive and offline-tolerant; the row shows up in the history table immediately and
syncs when the connection returns.

This is the first client INSERT into `PaymentHistory`, so the RLS policy in §4.4 is
the security-critical part of this change. It is written to be strict about the
things RLS can actually enforce, and §4.4 is explicit about what it cannot.

**Signatures are not at risk.** Payment state was moved out of the quote hashes
([20260903120000](../../supabase/migrations/20260903120000_payment_state_out_of_quote_hashes.sql),
[payment-does-not-invalidate-signature.md](./payment-does-not-invalidate-signature.md)),
so writing a `PaymentHistory` row cannot invalidate a client's signed contract.
Stated here because this is the first _client_ write into payment data and it is the
first question a reviewer will ask.

### 3.2 Append-only ledger

No UPDATE and no DELETE policy is added. A row, once entered, is permanent.

A mistake is corrected by entering the offsetting amount:

| Situation                    | Row entered                                             |
| ---------------------------- | ------------------------------------------------------- |
| Refunded $500 by check       | `-50000`, type `check`, note "Refund — over-billed"     |
| Check bounced (NSF)          | `-<original>`, type `check`, note "NSF, returned"       |
| Typed $1,500 instead of $150 | `-150000` then `+15000`, note referencing the first row |
| Chargeback on a manual card  | `-<amount>`, type `manual_credit_card`                  |

The audit trail is complete by construction — you can always see both the error and
its correction, which is what accounting wants and what an in-place edit destroys.
It also means the negative-amount path is exercised constantly, not just on refunds.

### 3.3 Allocation with negative amounts — a change to shipped behavior

**Read this before estimating.** Rev. 1 claimed this was an additive extension with
an unchanged signature. Both were wrong.
[`allocatePayments`](../../src/features/quotesAndBookings/utils/allocatePayments.ts)
as shipped:

- takes **three** arguments — `(installments, payments, eventCurrency)`;
- **clamps negatives out of existence** in three places:
  `const remaining = ordered.map((i) => Math.max(0, i.amountCents))`,
  `let money = Math.max(0, p.amountCents)` in pass 1, and
  `if (cents <= 0) return` inside `apply`;
- defines `totalReceivedCents` as `allocatedCents + unallocatedCents`, **not** as
  the sum of counted amounts.

So a `-270000` row today contributes exactly zero and disappears from every figure
on the page. Supporting negatives means removing those guards deliberately and
redefining the module's headline output, in a pure function that
`BillingTab`, `PayInvoiceTab`, `quoteDocumentData`, `computeAmountDue` and
`server/eventPaymentContext` all depend on, plus a green test suite.

That is still the right place for the change. The alternative — filtering or
pre-summing negatives at each call site — puts the same rule in five places that
will drift, which is the exact failure `payment-accounting-truth` exists to prevent.
But it is a re-opening of a shipped module, and it is why this spec needs its own
"Approved".

**The rules, restated in full.** Currency and status exclusion happen first and are
unchanged (§3.5). Of the payments that remain _counted_, split into _targeted_
(a non-empty `installmentId` that resolves) and _untargeted_ (everything else,
including dangling ids).

1. `targetedNet[i]` = Σ amounts of counted payments targeting installment `i` — may
   be negative.
2. `allocated[i]` = `clamp(targetedNet[i], 0, nominal[i])`.
3. `pool` = Σ untargeted amounts + Σᵢ `(targetedNet[i] - allocated[i])`. Overpayment
   on one installment spills in as positive; a net-negative target spills in as
   negative. **Money is never destroyed by clamping.**
4. If `pool > 0`: fill installments with remaining capacity, `dueDate` ascending
   then `id`, each to its nominal.
5. If `pool < 0`: **un-fill in reverse** — `dueDate` descending, reducing
   `allocated[i]` toward 0 until the pool is exhausted. The newest obligation is
   the first to reopen, which matches how a refund is understood.
6. Leftover becomes `unallocatedCents` — **signed**. Negative means more was
   refunded than the schedule can absorb.
7. `totalReceivedCents` = **Σ of all counted amounts, positive and negative.**
   This replaces the shipped `allocatedCents + unallocatedCents` definition. For
   all-positive input the two agree, which is why the existing suite stays green;
   with negatives they do not, and this one is the money question. It may
   legitimately be negative.
8. Per-installment status is unchanged: `paid` when `allocated >= nominal`,
   `partial` when `0 < allocated < nominal`, else `unpaid`. `allocated` is never
   negative, so no fourth state appears.
9. `InstallmentAllocation.paidAt` (the timestamp of the payment that completed an
   installment) is cleared when a refund reopens it — an installment that is no
   longer `paid` must not keep a completion timestamp.

Determinism, purity, `toSorted`, single pass and `Map` lookups
(payment-accounting-truth §3.5) all continue to hold; steps 4 and 5 are mutually
exclusive, so the walk is still linear.

### 3.4 What a negative row means in `byPayment` (locked)

`allocatePayments` returns a per-payment breakdown, `PaymentAllocation`, and the
Billing tab's **Applied To** column already renders it
([BillingTab.tsx:122](../../src/features/quotesAndBookings/components/quoteDetail/tabs/BillingTab.tsx)).
Rev. 1 was silent on what it holds for a refund. Locked here:

- **`parts[].cents` is signed.** A refund that reopens an installment attributes
  _negative_ cents to that installment.
- **`unallocatedCents` is signed**, per §3.3 step 6.
- The invariant `Σ parts[].cents + unallocatedCents === amountCents` holds for every
  counted payment, of either sign. This is the property `AppliedTo` already relies
  on, and it is the one T2 asserts.
- Reverse un-fill (step 5) attributes the reduction to the **refund** that caused
  it, not to the original payment. The original payment's `parts` are never
  rewritten — a payment's breakdown describes what _it_ did.

Signed parts are chosen over "empty parts plus a negative leftover" because they
keep one invariant true for all rows instead of two rules the reader must remember,
and because the "Applied To" cell can then say _which_ installment a refund reopened
— which is the question accounting asks.

**Correction, from the implementation (2026-09-03).** A refund names an installment
only when it was **targeted** at one. An _untargeted_ refund reads
"Unapplied (−$1,000)" even when the balance visibly moved, and that is correct
rather than a gap:

- Placement is computed from aggregates so that a refund and the payment it
  reverses commute (§3.3). When the pool nets out **positive**, there is no
  un-fill step at all — the later installments were simply never filled as far.
  Nothing was reopened, so there is nothing for the refund to name.
- Attributing one anyway would mean rewriting the _other_ payment's breakdown to
  claim money it never placed. A payment's parts describe what it did; a
  scheme that edits them after the fact to make a second row read better is
  exactly the kind of retrospective re-allocation rev. 4 of the dependency
  settled against.

Rev. 2's S12 asserted this against S5's untargeted refund, which was the wrong
scenario for the claim. It now names S3's targeted one, where the behaviour holds
and is tested. Accounting that wants a refund to name an installment should target
it in the dialog's **Apply To** — which is exactly what that field is for.

`AppliedTo` needs two consequent edits: its `leftover > 0` and
`showAmounts = parts.length > 1 || leftover > 0` conditions become `!== 0`, or a
refund's leftover renders as nothing.

### 3.5 Currency exclusion is now a correctness requirement

Since rev. 3 of the dependency, currency is an **exclusionary** rule, not a blind
spot: a payment whose currency differs from the event's is dropped from every total,
reported in `foreignCurrencyPayments`, marked `excluded: "currency"` per payment, and
surfaced to staff as an amber "reconcile them by hand" banner.

Therefore `recordManualPayment` **must** write
[`useEventCurrency(eventId)`](../../src/features/quotesAndBookings/hooks/useEventCurrency.ts)
— which resolves through `useOfficeCurrencies` / `pickEventCurrency` from the event's
sales office. Writing anything else puts accounting's check in the ledger, counts it
as $0, and raises a banner blaming them for it. This is why the dialog has no
currency picker (E5).

### 3.6 Distinguishing manual from Stripe

A new `entry_source` column (`'stripe' | 'manual'`), not an inference from
`payment_method_type`. Two reasons: legacy rows all say `"card"`, which is
indistinguishable from a manual card entry; and Stripe may add method types later
that we do not want to start guessing about.

`entry_source` also drives the UI: Stripe rows link to their receipt and are never
offered any action; manual rows show who recorded them.

### 3.7 Rejected alternatives

- **An `is_refund` boolean with positive amounts.** Every consumer would need to
  remember to negate, and the ones that forgot would be silently wrong — precisely
  the class of bug payment-accounting-truth exists to kill. A signed integer is
  self-describing and sums correctly with no branch.
- **Edit/delete on payment rows.** Destroys the audit trail, needs UPDATE/DELETE RLS
  on financial PII, and re-opens the "which number was right" question that the
  offsetting-row model answers by showing both.
- **A separate `ManualPayments` table.** Two tables to sum, two shapes to keep in
  step, and every reader would have to remember both — the same failure mode as the
  `PaymentInstallments.status` cache that was just deleted.
- **A service-role API route.** §3.1.
- **A `status: 'pending'` option in the dialog.** Allocation excludes
  non-`succeeded` rows, so a pending ACH would record money that shows as $0
  received, and nothing in the app would ever move it to succeeded. Worse than not
  offering it (E7).
- **Handling the sign outside `allocatePayments`** (filtering or pre-summing at each
  call site). Puts one rule in five modules that will disagree. §3.3.

---

## 4. Data / Schema

### 4.1 Columns that already exist (context, no change)

`PaymentHistory` today carries `intended_installment_id` (the historical target,
never re-pointed — [20260902120000](../../supabase/migrations/20260902120000_payment_history_intended_installment.sql))
and `stripe_connection_uuid`, both added after rev. 1 was written. Manual entry
writes the first and leaves the second null.

### 4.2 Migration — `supabase/migrations/<ts>_manual_payment_entry.sql`

```sql
alter table public."PaymentHistory"
  add column if not exists entry_source text not null default 'stripe',
  add column if not exists recorded_by_user_uuid uuid references public."Users"(id),
  add column if not exists reference text;

-- Existing rows are all webhook-written, so the default backfills them correctly.
alter table public."PaymentHistory"
  add constraint payment_history_entry_source_check
  check (entry_source in ('stripe', 'manual'));

-- A zero-amount payment is never meaningful and is always a UI bug.
-- Negatives are explicitly allowed: refunds, NSF checks, corrections (§3.2).
alter table public."PaymentHistory"
  add constraint payment_history_amount_nonzero_check
  check (amount_cents <> 0);

-- Manual rows must name their method and their author; Stripe rows must not
-- masquerade as manual ones.
alter table public."PaymentHistory"
  add constraint payment_history_manual_fields_check
  check (
    entry_source <> 'manual'
    or (
      payment_method_type in ('manual_credit_card', 'ach', 'check')
      and recorded_by_user_uuid is not null
      and stripe_checkout_session_id is null
      and stripe_payment_intent_id is null
    )
  );
```

`amount_cents <> 0` is added as a constraint rather than trusted to the form because
the form is not the only writer and never will be.

### 4.3 Both installment columns move together

A manual row's `Apply To` selection writes **`installment_id` and
`intended_installment_id` to the same value**, exactly as the webhook does. The
first is the live link allocation reads; the second is the historical fact that
survives a schedule rebuild. "Unapplied" writes null to both.

`usePaymentHistory` does not select `intended_installment_id` today. It does not
need to for allocation, but §6.4's history table shows the original target when it
differs from the live link, so the hook gains that column.

### 4.4 RLS — the security boundary

```sql
create policy "payment_history_insert" on public."PaymentHistory"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
    and entry_source = 'manual'
  );
```

No UPDATE, no DELETE, for anyone (§3.2). `viewer`, `developer` and `driver` get
nothing. The service role continues to bypass RLS for the webhook.

**What this policy does and does not enforce — read before implementing.** The
`with check` clause pins the role and forbids a client from writing a row that
claims to be a Stripe payment. It does **not** pin `recorded_by_user_uuid` to the
caller: `get_user_roles()` reads Clerk claims and there is no in-policy expression
for "the `Users.id` of the current caller" in this schema. So an account manager
could, with a crafted request, attribute a row to a colleague. That is a
_misattribution_ risk on a row they are already allowed to create, not an
escalation — and it is the same trust level as `created_by_user_uuid` elsewhere in
this codebase. The `payment_history_manual_fields_check` constraint keeps the field
non-null so the attribution is at least always present. If a stronger guarantee is
wanted, it needs a `current_user_uuid()` SQL helper, which is a broader change than
this ticket; flagged, not silently assumed away.

**AM scoping is deliberately not attempted in RLS.** Elsewhere an account manager
may only edit quotes they created, and the Billing tab already passes that decision
down as `canEdit`. Expressing it in this policy would require a join to `Events`
inside `with check` on every insert. The dialog is gated on `canEdit` (§6.1); the
policy is gated on role. Stated plainly so nobody later reads the policy as if it
enforced ownership.

### 4.5 Webhook change

In [route.ts](../../src/app/api/stripe/webhook/route.ts) the insert adds
`entry_source: "stripe"` and writes `payment_method_type: "stripe"` instead of
`session.payment_method_types?.[0] ?? "card"`. The Stripe method detail (`card`,
`us_bank_account`) moves to `reference`, where it stays visible without competing
with the four canonical types. Nothing else about the webhook's row changes —
`intended_installment_id`, `stripe_connection_uuid` and the `23505` idempotency
path are all untouched.

Because that value is currently printed raw in the Billing tab, §6.4's display map
ships in the same commit or users read `manual_credit_card` on screen.

### 4.6 PowerSync

`AppSchema.ts` — add `entry_source`, `recorded_by_user_uuid`, `reference` to
`PaymentHistoryCols` (all `column.text`; PowerSync has no uuid type). Run
`npm run gtl` after the migration to regenerate `database.types.ts`.

**Sync rules — the read half is settled.** Rev. 1 made this a blocking unknown.
`PaymentHistory` demonstrably syncs to clients: the Billing tab reads it from the
local DB through `usePaymentHistory` and shipped on 2026-09-03.

### T0 — answer (recorded 2026-09-03)

**Read direction: PASS**, as above — in production, not in a test.

**Write direction: partly answered, and it changes T4.** Reading
[BackendConnector.ts:71–128](../../src/lib/powersync/BackendConnector.ts) settles the
mechanism without needing a live run:

- `uploadData` replays each CRUD op through `this.client.from(op.table).upsert(...)`
  under the user's Clerk JWT, so a client INSERT does reach PostgREST and is judged
  by RLS. The path exists.
- `FATAL_RESPONSE_CODES` is `[/^22...$/, /^23...$/, /^42501$/]`. On a match the
  connector logs `console.error("Data upload error - discarding:", …)` and calls
  `transaction.complete()` — **the row is dropped from the local queue and nothing
  reaches the user.**

Two consequences, both of which the implementation must respect:

1. **`recordManualPayment` cannot propagate an upload rejection to its caller.** The
   local `typedExecute` resolves as soon as the row lands in the local DB; the upload
   is a later, out-of-band step in the connector. T4's rev. 2 wording ("propagates a
   rejected upload as an error the caller can toast") is **not achievable** with this
   connector, and no `await` in the dialog can make it so. T4 is corrected in §10 to
   test what is actually true: the local write and its row shape.
2. **Our own new constraints are in the fatal set.** A CHECK violation is `23514`, so
   `amount_cents = 0` or a malformed manual row would be discarded exactly as
   silently as a `42501`. The dialog's client-side validation (§6.3) is therefore the
   only thing standing between a user and silent data loss — which is an argument for
   the validation, not a replacement for the constraints (§4.2).

So E8's toast has only one place it can live: **the connector**, which is where the
discard happens. That is a shared-infrastructure change benefiting every write path
in the app, not just this one, and it is taken into scope here because silent
financial data loss is the specific risk this feature introduces.

**Still unverified, and honestly so:** that an `admin` Clerk JWT actually satisfies
`payment_history_insert` end to end against the deployed backend. That needs a
logged-in browser session and cannot be established from the repository. T3 proves
the policy at the SQL level; the end-to-end confirmation is a manual check before
release, listed in §11.

---

## 5. TypeScript contracts (locked)

```ts
// src/features/quotesAndBookings/types/paymentTypes.ts
export const MANUAL_PAYMENT_METHODS = ["manual_credit_card", "ach", "check"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];
export type PaymentMethodType = ManualPaymentMethod | "stripe";

export type EntrySource = "stripe" | "manual";

/** What a user sees. The stored value is never printed raw (§4.5, §6.4). */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  stripe: "Stripe",
  manual_credit_card: "Manual Credit Card",
  ach: "ACH Payment",
  check: "Check",
};
```

```ts
// src/features/quotesAndBookings/db/recordManualPayment.ts
export type RecordManualPaymentInput = {
  eventId: string;
  /** Writes BOTH installment_id and intended_installment_id (§4.3). */
  installmentId: string | null; // null = unapplied, allocated FIFO
  amountCents: number; // non-zero; negative = refund / correction
  currency: Currency; // always useEventCurrency(eventId) — §3.5
  method: ManualPaymentMethod;
  payerName: string;
  reference: string | null; // check #, ACH trace, terminal auth code
  notes: string | null;
  paidAt: string; // ISO; the date money moved, not "now"
  recordedByUserUuid: string;
};

export function recordManualPayment(input: RecordManualPaymentInput): Promise<void>;
```

```ts
// src/features/quotesAndBookings/utils/parseAmountInput.ts
export type ParsedAmount =
  | { ok: true; cents: number }
  | { ok: false; reason: "empty" | "not-a-number" | "zero" | "too-large" };

/** Parses "1,234.56", "-1234.56", "($12.00)" → signed cents. */
export function parseAmountInput(raw: string): ParsedAmount;
```

The `PaymentHistoryRow` type in
[`usePaymentHistory.ts`](../../src/features/quotesAndBookings/hooks/usePaymentHistory.ts)
gains `entrySource: EntrySource`, `recordedByUserUuid: string | null`,
`reference: string | null`, and `intendedInstallmentId: string | null` (§4.3).
`BillingTab` props are unchanged.

**The `allocatePayments` signature is unchanged** — `(installments, payments,
eventCurrency)`, as shipped. Its documented rules and the meaning of two of its
return fields change (§3.3, §3.4), which is why it stays a single shared function
rather than growing a variant.

---

## 6. UI behavior

### 6.1 The button

- `admin`: enabled on every quote.
- `account_manager`: enabled wherever the `canEdit` prop the tab already receives is
  true, disabled elsewhere with a title explaining why — mirroring the QuickBooks
  checkbox immediately above it.
- `viewer`: not rendered. There is nothing they could do with it.

The current permanent `disabled` + "not available yet" title is removed.

**A lead AM may record a payment on any quote, including quotes they did not
create.** This needs no new rule and no new prop: `canEdit` comes from
[`canEditOwnedEntity`](../../src/features/userAccess/logic/canEditOwnedEntity.ts),
called in
[QuoteDetailView.tsx:197](../../src/features/quotesAndBookings/components/quoteDetail/QuoteDetailView.tsx),
and that function already resolves lead status ahead of ownership:

```ts
// Lead in any zone → full edit on all entities
if (leadZoneIds.length > 0) return true;

// Junior AM → own or assigned only
if (isAccountManager || accountManagerZoneIds.length > 0) { … createdByUserId === userId … }
```

So the account-manager rule is precisely: **lead in at least one zone → enabled
everywhere; otherwise enabled only on quotes they created.** Rev. 2 of this spec
described it as "their own quotes", which was wrong for lead AMs; the code was
already right.

Two consequences worth stating so nobody re-derives them:

- **Lead is zone-scoped in the data, but not in this decision.** Lead status lives
  on `AccountManagerZones.is_lead`, per zone. `canEditOwnedEntity` deliberately
  treats a lead in _any_ zone as a lead everywhere for owned entities, and
  `QuoteDetailView` does not pass `eventBleacherZoneIds`, so the zone gate in that
  function does not narrow it here. Do not add a zone check to the button — it
  would make the Billing tab disagree with every other control on the page.
- **The RLS policy (§4.4) needs no change for this.** It is gated on role
  (`admin`, `account_manager`), never on ownership, so a lead AM already passes it —
  and so does a junior AM, whose narrower limit is enforced in the UI by `canEdit`.
  That split is deliberate and already documented in §4.4; lead AMs are the reason
  it reads the way it does.

### 6.2 The dialog — `RecordPaymentDialog`

Built on the existing `@/components/ui/dialog`. Fields, in order:

| Field         | Control                                                                                             | Required                   |
| ------------- | --------------------------------------------------------------------------------------------------- | -------------------------- |
| Payment Type  | segmented / select: Manual Credit Card · ACH Payment · Check                                        | yes                        |
| Amount        | text input, signed, event currency prefix                                                           | yes                        |
| Date Received | date input, defaults to today, may not be in the future                                             | yes                        |
| Apply To      | select: "Not applied to an installment" + each installment, showing due date, nominal and remaining | no (defaults to unapplied) |
| Payer Name    | text, prefilled from the quote's contact                                                            | yes                        |
| Reference     | text — label follows the type: "Check #", "ACH trace", "Auth code"                                  | no                         |
| Notes         | textarea                                                                                            | no                         |

Stripe is **not** in the Payment Type list. A one-line hint under it says Stripe
payments appear automatically when a client pays online.

The dialog is loaded with `next/dynamic`, `ssr: false` — valid because `BillingTab`
is a client component
([`DynamicSystemProvider.tsx`](../../src/components/providers/DynamicSystemProvider.tsx)
is the existing precedent); it must not be hoisted into a Server Component. It is a
modal most Billing-tab visits never open, and the date control and form state should
not sit in the tab's own bundle. Its state is local `useState` derived during render,
with no effect mirrors.

**Submission follows the pattern already in this file.** `BillingTab` writes the
QuickBooks flag through an optimistic value plus a chained promise queue, precisely
so fast clicks cannot land out of order. Manual entry has the same problem (E6), so
it uses the same shape rather than introducing `useTransition`, which the codebase
does not use anywhere today. If the implementer prefers `useTransition`, that is a
deviation to raise, not to make silently.

### 6.3 Negative amounts in the UI — the whole point

- The Amount input accepts a leading `-`, and also accounting's `(12.00)`
  parenthesis notation, both parsed by `parseAmountInput`.
- When the parsed amount is negative the dialog changes visibly: the amount renders
  red, and a line appears — _"This records money going **out** (refund, bounced
  check, or correction). It does not issue a Stripe refund."_ This is a
  hard-to-reverse, outward-facing accounting entry, and it must not be possible to
  enter one by accident with a stray keystroke.
- The submit button reads **Record Payment** for a positive amount and **Record
  Refund / Adjustment** for a negative one.
- `0` is rejected inline ("Amount cannot be zero"), matching the DB constraint.
- `|amount| > $1,000,000` is rejected as a typo guard; the cap is a named constant,
  not a literal.
- Negatives are allowed even when nothing has been received yet. It reads oddly but
  it is legitimate (a refund entered before the payment it reverses is reconciled),
  the ledger sums correctly either way, and blocking it would trap accounting with
  no way out of a data-entry order they do not control.

### 6.4 Payment History table

The table exists today with Date · Amount · Payer · Applied To · Receipt. Changes:

- Amount is currently hard-coded `text-green-600`. It becomes green when positive,
  **red when negative**. `formatMoney` already renders a leading minus sign
  (`-$2,700.00`), so no parenthesis notation reaches the screen.
- A **Type** column: Stripe · Manual Credit Card · ACH Payment · Check, through
  `PAYMENT_METHOD_LABELS` (§5). The raw `payment_method_type` currently appended to
  the Payer cell is removed — it is a stored value, not a label.
- A **Recorded by** column — the user's name for manual rows, "Stripe" for webhook
  rows, driven by `entry_source` (§3.6).
- **Applied To** keeps its current behavior and gains signed parts (§3.4): a refund
  names the installment it reopened, with a negative figure. Its `leftover > 0`
  conditions become `!== 0`.
- `Reference` shown under the type when present.
- Where `intended_installment_id` differs from `installment_id` (a schedule was
  rebuilt under the payment), the original target is shown as secondary text.
- Stripe rows keep their receipt link. No row offers edit or delete; the empty-state
  and the header carry a short note that corrections are entered as negatives.

### 6.5 Summary and schedule

Unchanged in shape — they read the allocation, which now accounts for negatives:

- `Payments Received` may show a negative total; it is rendered red rather than
  green when it does, and never clamped to zero.
- `Balance Due` is `max(0, contractTotal - received)` today; after a refund the
  subtraction grows, and the floor at $0 keeps applying only to overpayment. A
  refund therefore raises Balance Due, correctly.
- An installment that a refund reopened returns to `Partial` or `Unpaid`
  automatically (§3.3 step 5), and loses its completion timestamp (step 9).

---

## 7. Scenarios (Playwright + component)

| #   | Given                                                                 | When                                                  | Then                                                                                        |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| S1  | admin on a booking, schedule 2 × $2,700                               | records a $2,700 Check applied to installment 1       | installment 1 `Paid`; Received $2,700; history shows one Check row with the check number    |
| S2  | same, no schedule                                                     | records a $500 ACH, unapplied                         | Received $500; Balance Due drops by $500; no schedule table                                 |
| S3  | a $2,700 Check already recorded                                       | records **−$2,700** Check, same installment, NSF note | installment 1 back to `Unpaid` with no `paidAt`; Received $0; two rows, one green one red   |
| S4  | $1,500 recorded by typo (meant $150)                                  | records −$1,500 then $150                             | Received $150; three rows visible; nothing was edited or deleted                            |
| S5  | schedule 2 × $2,700, both paid                                        | records −$1,000 unapplied                             | installment 2 becomes `Partial $1,700 of $2,700`; installment 1 untouched (reverse un-fill) |
| S6  | Amount field                                                          | user types `0`                                        | inline error, submit disabled, no write                                                     |
| S7  | Amount field                                                          | user types `-50`                                      | red amount, warning line, button reads "Record Refund / Adjustment"                         |
| S8  | **junior** account_manager (lead of no zone) on another AM's quote    | opens the Billing tab                                 | button disabled with an explanatory title; no dialog                                        |
| S9  | viewer                                                                | opens the Billing tab                                 | no button at all; history is fully readable                                                 |
| S10 | offline (PowerSync disconnected)                                      | records a Check                                       | row appears immediately in history; uploads on reconnect                                    |
| S11 | a Stripe payment and a manual check on one quote                      | opens Billing                                         | both rows listed, labelled Stripe / Check; totals include both                              |
| S12 | S3's refund (**targeted** at installment 1)                           | reads the Applied To cell of the −$2,700 row          | names installment 1 with a negative figure (§3.4), not "Unapplied"                          |
| S13 | **lead** account_manager (`is_lead` in ≥1 zone) on another AM's quote | opens the Billing tab, records a $500 Check           | button **enabled**; the row is written and attributed to them (§6.1)                        |

---

## 8. Edge cases

- **E1 — negative beyond the schedule.** Refunds exceeding everything allocated
  leave `unallocatedCents` negative and `totalReceivedCents` possibly negative. Both
  are displayed, neither is clamped in the data. Only the payment-accounting-truth
  §6.1 "Balance Due floored at $0" display rule clamps, and only for overpayment.
- **E2 — negative applied to an installment with nothing on it.** `allocated`
  clamps at 0 and the surplus negative spills into the pool (§3.3 step 3), reopening
  later installments. No installment ever shows a negative allocation.
- **E3 — an installment with a manual payment on it cannot be deleted.** Settled by
  the dependency's rev. 4, in the opposite direction to rev. 1's guess: the
  `installment_id` FK stays restrictive **on purpose**, and `syncPaymentInstallments`
  refuses the removal with `ScheduleBlockedError` / `describeBlockedRemovals`
  rather than throwing a raw FK error. Rev. 1's contingency — "limit `Apply To` to
  installments with no referencing payments" — is therefore **dropped**. The real
  consequence is the opposite one: letting staff attach payments by hand makes more
  installments undeletable, so the schedule editor's blocked-removal message must
  read sensibly for a hand-entered payment, not only a Stripe one.
- **E4 — future-dated `paidAt`.** Rejected in the dialog. A payment received
  tomorrow is not received.
- **E5 — currency.** The dialog writes `useEventCurrency`; no picker. A row entered
  in another currency would be **excluded from every total** and raise the
  foreign-currency banner (§3.5), so this is a correctness rule, not a preference.
- **E6 — double submit.** The submit button is disabled for the duration of the
  write, writes are chained (§6.2), and the insert carries a client-generated `id`,
  so a retried upload is an idempotent upsert rather than a second payment.
- **E7 — ACH that later fails.** Out of scope as a lifecycle; expressed as a
  negative row. The dialog's ACH hint says so, so accounting is not left guessing.
- **E8 — PowerSync upload rejected by RLS.** The connector treats a `42501` as
  fatal and _discards_ the transaction
  ([BackendConnector.ts:118](../../src/lib/powersync/BackendConnector.ts)) — the row
  would vanish from local state with no user-visible error. Since the dialog is only
  reachable by roles the policy allows, this means a genuine bug rather than normal
  denial; it must be surfaced with an error toast rather than swallowed. Confirm the
  connector's behavior during T0 and add the toast path if it is missing.
- **E9 — a manual row and the Stripe webhook racing on one installment.** Both write
  `PaymentHistory`; allocation is computed from the full set at read time, so the
  order does not matter. There is no installment-status cache left to disagree with
  it — the columns were dropped.
- **E10 — clock skew on `created_at`.** `comparePayments` orders by effective
  timestamp, then `created_at`, then `id`, so two rows entered in the same second
  still order stably.
- **E11 — a negative row in a foreign currency.** Excluded like any other
  mismatched-currency payment: it must not un-fill anything, and it appears in the
  banner. Tested explicitly, because the un-fill path is new and the exclusion runs
  before it.

---

## 9. Permissions

Two edits to
[`permissionPageData.ts`](../../src/features/userAccess/permissionPageData.ts), in
the same commit as the UI:

**1. Fix the existing "Payment History" entry.** Its `admin` note currently reads
_"…Nobody can record a payment by hand yet; payments appear on their own once the
client pays."_ That sentence becomes false the moment this ships, and
`/permissions` is read by the account managers themselves.

**2. Add a new entry**, "Record a Payment", category "Day to Day Operations":

| Role            | Level  | Note                                                                                                                                                                                                                                                |
| --------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin           | full   | Can record a card, ACH or check payment on any quote or booking, including a negative amount for a refund or correction. Cannot edit or delete a recorded payment — corrections are entered as a negative.                                          |
| account_manager | custom | A **lead AM** can do all of that on any quote or booking, including ones they did not create. Everyone else can only do it on the quotes they created — on other people's quotes the button is disabled. Same rule as every other edit on the page. |
| viewer          | none   | Can read the payment history but sees no button.                                                                                                                                                                                                    |
| developer       | none   | No access to quotes.                                                                                                                                                                                                                                |
| driver          | none   | Driver Mobile App only.                                                                                                                                                                                                                             |

Wording is aimed at the account managers who actually read `/permissions`, so it
says what they can do and — because it will be the first question — that a mistake
is fixed by entering a negative, not by deleting.

---

## 10. TDD plan (implementation order)

Red → green → refactor. Every task starts from a failing test.

**T0 — pre-check (blocking, §4.6).** The read direction is already proven in
production. What is unproven is the write: that PowerSync's upload connector replays
a client INSERT into `PaymentHistory` to PostgREST under the Clerk JWT, that it
passes the new RLS policy, and that a `42501` surfaces rather than silently
discarding the row (E8). Do this against a scratch row before any UI work, and
record the answer here.

**T1 — `parseAmountInput`.** `utils/parseAmountInput.test.ts`, first and failing:
`"12.34"` → 1234; `"-12.34"` → −1234; `"(12.34)"` → −1234; `"1,234.56"` → 123456;
`"$-5"` → −500; `"0"` / `"0.00"` / `"-0"` → `zero`; `""` → `empty`; `"abc"`,
`"1.2.3"`, `"--5"` → `not-a-number`; `"12.345"` → rounds to 1235 (half-up, stated);
`"9999999"` → `too-large`. Float drift (`0.1 + 0.2`) must not appear — parse to
integer cents without floating multiplication where avoidable.

**T2 — `allocatePayments` with negatives.** The largest task, and the one §3.3
re-opens. Extend the existing suite; **the all-positive cases must stay green
untouched** — that is the regression guard, and it is what makes removing the
`Math.max(0, …)` guards safe. New, red first:

- S3, S4, S5 as unit cases;
- a negative targeted at an empty installment (E2);
- a refund larger than everything received (E1: negative `totalReceivedCents`,
  negative `unallocatedCents`);
- reverse un-fill order asserted explicitly (latest due date reopens first);
- `paidAt` cleared on an installment a refund reopened (§3.3 step 9);
- `byPayment` under mixed signs: signed `parts`, signed `unallocatedCents`, and the
  invariant `Σ parts + unallocated === amountCents` for every row (§3.4);
- a **negative payment in a foreign currency** — excluded, un-fills nothing (E11);
- ordering independence and purity re-asserted with mixed signs.

**T3 — migration + RLS.** SQL-level, following the pattern in
[`supabase/tests/payment_does_not_invalidate_signature.test.sql`](../../supabase/tests/payment_does_not_invalidate_signature.test.sql):
insert as `admin` succeeds; as `viewer` fails; `amount_cents = 0` rejected;
`entry_source = 'stripe'` from a client rejected; `entry_source = 'manual'` without
`recorded_by_user_uuid` rejected; UPDATE and DELETE rejected for every role. Then
`npm run gtl` and `AppSchema.ts` (§4.6).

**T4 — `recordManualPayment`.** Writes the expected row shape; sets
`status: "succeeded"`, `entry_source: "manual"`, the event currency, a
client-generated `id`, and **both** installment columns (§4.3).

Rev. 2 also asked it to "propagate a rejected upload as an error the caller can
toast". T0 established that it cannot: the local write resolves before the upload
is attempted, and the connector discards a rejection out of band. So T4 asserts the
local write and its row shape, plus the guards that run **before** it — zero, over
the cap, and no author — because a bad row would be discarded as silently as an RLS
refusal. E8's toast moved to the connector, where the discard actually happens.

**T5 — `RecordPaymentDialog`.** The dialog's rules — zero rejected, a negative
amount changing the warning and the button label, the future-date refusal, the
Reference label following the type, Apply To defaulting to unapplied, a submission
already in flight — live in `utils/recordPaymentForm.ts` as a pure function, and are
tested there directly.

That is a deviation from rev. 2, which said "component tests first", and it is
forced: this repository has **no jsdom and no testing-library**. Component tests use
`renderToStaticMarkup`, which can assert what a component renders for given props
but cannot type into a field. Testing S6 and S7 through the DOM would mean adding
two dev dependencies and a test environment to the project, which is a bigger
decision than this ticket. Extracting the logic is the smaller change and the better
one: the rules are the interesting part, and they are now tested without a DOM at
all. The real typing is covered by Playwright.

**T6 — `BillingTab` integration.** S1, S2, S3, S8, S9, S11, S12, S13 at component
level: negative rows render red with a minus sign; the Type and Recorded by columns;
`AppliedTo` naming a reopened installment; and the button's **four** access states —
admin, lead AM on someone else's quote (enabled, S13), junior AM on someone else's
quote (disabled, S8), viewer (absent, S9). S8 and S13 differ only by `leadZoneIds`,
so they are the test that stops a future refactor from collapsing the two.

No change to `canEditOwnedEntity` is in scope; its lead branch is already covered by
`canEditOwnedEntity.test.ts` ("Lead AM"). T6 asserts that the button honours the
prop, not that the function is correct.

**T7 — `permissionPageData.ts`** (§9), both edits, same commit as T6.

**T8 — webhook** (§4.5): the inserted row carries `entry_source: "stripe"` and
`payment_method_type: "stripe"`, with the Stripe method detail in `reference`.
Existing webhook tests stay green, including the `23505` idempotency path.

### Playwright

**Runs, unlike payment-accounting-truth's.** Manual entry is reachable entirely
through the UI with no Stripe redirect, so S1–S3, S9 and S13 are real e2e specs:
`recordPayment.admin.spec.ts`, `recordPayment.am.spec.ts`,
`recordPayment.viewer.spec.ts`. They need a seeded quote with a payment schedule in
`seed.sql`; if one is not already there, adding it is part of T6 and requires
`npx supabase db reset`.

**The `am` Playwright project is a lead AM.** `seed.sql` gives the E2E account
manager one zone with `is_lead = true` (the row seeded for
`driver-zones.am.spec.ts`). So `recordPayment.am.spec.ts` naturally covers **S13**,
not S8 — on another AM's quote its button is **enabled**, and a spec asserting it is
disabled would fail for the right reason and be "fixed" the wrong way.

**S8 has no e2e home today** and stays at component level (T6), where `leadZoneIds`
is an input rather than a seeded fact. Seeding a second, non-lead account manager
purely to cover it is out of scope here; if it is wanted, it is a `seed.sql` +
`auth.setup.ts` change affecting every AM spec, and it is worth doing once for all
of them rather than for this ticket alone.

S10 (offline) stays out of Playwright — driving PowerSync's connection state from a
browser test is not worth its flake cost; it is covered at the module level in T4.

---

## 11. Definition of Done

- [x] T0 answered (the **write** direction) and written into §4.6
- [x] `npm run tc` — clean
- [x] `npm run test` — 1320 passing, 124 files
- [x] `npm run test:db:payments` — new; constraints and RLS (T3)
- [x] `npm run gtl` after the migration (§4.6)
- [x] `permissionPageData.ts` — **both** edits (§9)
- [x] `allocatePayments`' doc comment rewritten (§3.3)
- [ ] `npm run lint` — **red before this change and still red**: 141 files fail
      Prettier on this branch, including files this ticket never touched
      (`src/lib/useTimezoneStore.ts`, `canEditOwnedEntity.ts`). Every file this
      ticket did touch passes. Formatting the other 141 is a separate commit; doing
      it here would bury the change in an unrelated diff.
- [ ] `npm run test:e2e` — **not yet run.** The three specs are written and the
      fixtures are in `seed.sql`, but loading them needs `npx supabase db reset`,
      which wipes local development data. Needs the owner's go-ahead, then:
      `npx supabase db reset && npm run test:e2e -- --project=admin --project=am --project=viewer`.
- [ ] payment-accounting-truth §6.3 ("+ Record Payment stays disabled") marked
      superseded there, so the two specs do not contradict each other
- [ ] End-to-end confirmation that an admin's Clerk JWT satisfies
      `payment_history_insert` against the deployed backend (§4.6). Not
      establishable from the repository; a manual check before release.
