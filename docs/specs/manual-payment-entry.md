# Spec: Manual Payment Entry — `+ Record Payment`

Status: **DRAFT (rev. 1) — awaiting "Approved"**
Owner: quotesAndBookings / payments
Routes affected:

- Staff: `/quotes-bookings/[id]?tab=billing` (the `+ Record Payment` button)
- Server: `/api/stripe/webhook` (one field, see §4.3)

Depends on: [payment-accounting-truth.md](./payment-accounting-truth.md)
Related: [payment-history-security.md](./payment-history-security.md)

> **Dependency, stated up front.** `payment-accounting-truth.md` makes
> `PaymentHistory` the source of truth and introduces `allocatePayments`. This spec
> assumes that one lands first: it writes rows into `PaymentHistory` and lets the
> shared allocation function answer every money question. Merging manual entry on
> top of today's `PaymentInstallments.status` logic would make a hand-entered
> payment invisible in exactly the way Bug 2 already is. §11 has a fallback if the
> two must ship in the other order.

---

## 1. Summary

Accounting takes money that never touches Stripe — a check in the mail, an ACH
transfer, a card run manually on a terminal — and it currently has nowhere to go.
The `+ Record Payment` button on the Billing tab
([BillingTab.tsx:226](../../src/features/quotesAndBookings/components/quoteDetail/tabs/BillingTab.tsx))
renders, hovers, and does nothing: no `onClick`.

This spec gives it a dialog, and gives `PaymentHistory` a client write path, with
one property that shapes everything else: **an amount may be negative.**

Negative is not a curiosity. It is how accounting expresses a refund, a bounced
check, a chargeback, and a correction of their own typo. Because payments are an
append-only ledger (§3.2), a negative row is the _only_ way to undo anything — so
"handles negative values" is the mechanism this feature runs on, not a validation
relaxation bolted onto it.

### Payment types

| Type               | Stored `payment_method_type` | Entered by                                 |
| ------------------ | ---------------------------- | ------------------------------------------ |
| Stripe             | `stripe`                     | the webhook, automatically — never by hand |
| Manual Credit Card | `manual_credit_card`         | accounting, in the dialog                  |
| ACH Payment        | `ach`                        | accounting, in the dialog                  |
| Check              | `check`                      | accounting, in the dialog                  |

Stripe is a _fourth peer in the same ledger_, not a separate table: the Billing tab
lists all four together, and the totals do not care where a row came from.

### Goals

1. Accounting can record a payment of any of the three manual types against a quote
   or booking, applied to a chosen installment or to none.
2. Amounts may be **negative** end to end — input, validation, storage, allocation,
   totals, display — with a defined meaning at each step.
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
- Multi-currency entry. The dialog uses the event's currency, not a picker (E5).
- Attachments (a scan of the check). Separate ticket.
- Changing `contractTotalCents`, the payment schedule editor, or the public
  `/quote/[eventUUID]` page. Manual rows appear in the public totals automatically
  through `allocatePayments`; nothing there changes shape.

---

## 2. Current behavior (baseline)

- The button has no handler — it is a live-looking control that silently does
  nothing. (`payment-accounting-truth.md` §6.3 proposes disabling it in the interim;
  this spec supersedes that by making it work.)
- `PaymentHistory` RLS grants **SELECT only**, to `admin` / `account_manager` /
  `viewer`. There is no INSERT policy for `authenticated`, by design
  ([20260805120000_payment_history_rls.sql](../../supabase/migrations/20260805120000_payment_history_rls.sql)) —
  every existing row is written by the service role from the webhook.
- `amount_cents integer not null` has **no** check constraint, so negatives are
  already storable. Nothing downstream is written to expect them.
- `payment_method_type` holds whatever Stripe reported —
  `session.payment_method_types[0] ?? "card"`, i.e. `"card"` for every production
  row today.

---

## 3. Architecture

### 3.1 Write path — local-first, RLS-gated

Manual entry is a normal app write, so it follows
[POWERSYNC_ARCHITECTURE.md](../POWERSYNC_ARCHITECTURE.md): Kysely → `.compile()` →
`typedExecute`, into the local `PaymentHistory` table. PowerSync's upload connector
([BackendConnector.ts:71](../../src/lib/powersync/BackendConnector.ts)) replays the
insert to PostgREST under the user's Clerk JWT, so **the RLS INSERT policy is the
authorization boundary** — not the dialog, and not the button's `disabled` prop.

Why not an API route with the service role (the webhook's path)? Because that
bypasses RLS, needs its own hand-rolled role check, breaks offline entry, and makes
the new row appear only after a round trip and a refetch. The local-first write is
reactive and offline-tolerant; the row shows up in the history table immediately and
syncs when the connection returns.

This is the first client INSERT into `PaymentHistory`, so the RLS policy in §4.2 is
the security-critical part of this change. It is written to be strict about the
things RLS can actually enforce, and §4.2 is explicit about what it cannot.

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

### 3.3 Allocation with negative amounts (extends `allocatePayments`)

`allocatePayments` (payment-accounting-truth §3.1) currently assumes non-negative
amounts. Its rules are extended — additively; every existing test stays green
because for all-positive input the behavior is identical:

Let succeeded payments be split into _targeted_ (a non-empty `installmentId` that
resolves) and _untargeted_ (everything else, including dangling ids).

1. `targetedNet[i]` = Σ amounts of payments targeting installment `i` — may be
   negative.
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
7. `totalReceivedCents` = Σ of _all_ succeeded amounts, positive and negative. This
   is the money question, and it may legitimately be negative (a fully refunded
   quote with a fee retained the wrong way round).
8. Per-installment status is unchanged: `paid` when `allocated >= nominal`,
   `partial` when `0 < allocated < nominal`, else `unpaid`. `allocated` is never
   negative, so no fourth state appears.

Determinism, purity, `toSorted`, single pass and `Map` lookups (payment-accounting-truth
§3.5) all continue to hold; steps 4 and 5 are mutually exclusive, so the walk is
still linear.

### 3.4 Distinguishing manual from Stripe

A new `entry_source` column (`'stripe' | 'manual'`), not an inference from
`payment_method_type`. Two reasons: legacy rows all say `"card"`, which is
indistinguishable from a manual card entry; and Stripe may add method types later
that we do not want to start guessing about.

`entry_source` also drives the UI: Stripe rows link to their receipt and are never
offered any action; manual rows show who recorded them.

### 3.5 Rejected alternatives

- **An `is_refund` boolean with positive amounts.** Every consumer would need to
  remember to negate, and the ones that forgot would be silently wrong — precisely
  the class of bug payment-accounting-truth exists to kill. A signed integer is
  self-describing and sums correctly with no branch.
- **Edit/delete on payment rows.** Destroys the audit trail, needs UPDATE/DELETE RLS
  on financial PII, and re-opens the "which number was right" question that the
  offsetting-row model answers by showing both.
- **A separate `ManualPayments` table.** Two tables to sum, two shapes to keep in
  step, and every reader would have to remember both — the same failure mode as
  reading `PaymentInstallments.status`.
- **A service-role API route.** §3.1.
- **A `status: 'pending'` option in the dialog.** Allocation ignores non-`succeeded`
  rows, so a pending ACH would record money that shows as $0 received, and nothing
  in the app would ever move it to succeeded. Worse than not offering it (E7).

---

## 4. Data / Schema

### 4.1 Migration — `supabase/migrations/<ts>_manual_payment_entry.sql`

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

### 4.2 RLS — the security boundary

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

### 4.3 Webhook change

One line in
[route.ts](../../src/app/api/stripe/webhook/route.ts): the insert adds
`entry_source: "stripe"` and writes `payment_method_type: "stripe"` instead of
`session.payment_method_types?.[0] ?? "card"`. The Stripe method detail (`card`,
`us_bank_account`) moves to `reference`, where it stays visible without competing
with the four canonical types. No other webhook behavior changes here.

### 4.4 PowerSync

`AppSchema.ts` — add `entry_source`, `recorded_by_user_uuid`, `reference` to
`PaymentHistoryCols` (all `column.text`; PowerSync has no uuid type). Run
`npm run gtl` after the migration to regenerate `database.types.ts`.

`PaymentHistory` must be in the PowerSync sync rules — the T0 pre-check inherited
from payment-accounting-truth §3.3. Here it is doubly blocking: without sync, a
manual insert lands in a local table that is never uploaded, and the payment is
**lost**, not merely invisible. If T0 comes back negative, this feature does not
ship until the sync rules are fixed; the online-only fallback (option b there) is
**not** acceptable for a write path.

---

## 5. TypeScript contracts (locked)

```ts
// src/features/quotesAndBookings/types/paymentTypes.ts
export const PAYMENT_METHOD_TYPES = ["manual_credit_card", "ach", "check"] as const;
export type ManualPaymentMethod = (typeof PAYMENT_METHOD_TYPES)[number];
export type PaymentMethodType = ManualPaymentMethod | "stripe";

export type EntrySource = "stripe" | "manual";
```

```ts
// src/features/quotesAndBookings/db/recordManualPayment.ts
export type RecordManualPaymentInput = {
  eventId: string;
  installmentId: string | null; // null = unapplied, allocated FIFO
  amountCents: number; // non-zero; negative = refund / correction
  currency: Currency;
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

The `PaymentHistoryRow` type from payment-accounting-truth §5 gains
`entrySource: EntrySource`, `recordedByUserUuid: string | null`, and
`reference: string | null`. `BillingTab` props are unchanged.

The `allocatePayments` signature is unchanged — only its documented rules extend
(§3.3), which is why it stays a single shared function.

---

## 6. UI behavior

### 6.1 The button

- `admin`: enabled on every quote.
- `account_manager`: enabled where `canEdit` is true (their own quotes), disabled
  elsewhere with a title explaining why — mirroring the QuickBooks checkbox
  immediately above it.
- `viewer`: not rendered. There is nothing they could do with it.

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

The dialog is loaded with `next/dynamic`, `ssr: false` (`bundle-dynamic-imports`) —
it is a modal that most Billing-tab visits never open, and the date control and
form state should not sit in the tab's own bundle. Its state is local `useState`
derived during render, with no effect mirrors (`rerender-derived-state-no-effect`);
submission runs through `useTransition` for the pending state
(`rendering-usetransition-loading`).

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

Per payment-accounting-truth §6.3, plus:

- Amount rendered green when positive, **red with an explicit minus sign** when
  negative — never bare parentheses, which are easy to miss at a glance.
- A `Type` column: Stripe · Manual Credit Card · ACH · Check.
- A `Recorded by` column — the user's name for manual rows, "Stripe" for webhook
  rows.
- `Reference` shown under the type when present.
- Stripe rows keep their receipt link. No row offers edit or delete; the empty-state
  and the header carry a short note that corrections are entered as negatives.

### 6.5 Summary and schedule

Unchanged in shape — they read the allocation, which now accounts for negatives:

- `Payments Received` may show a negative total; it is rendered red rather than
  green when it does, and never clamped to zero.
- `Balance Due` may exceed the contract total after a refund. That is correct and is
  displayed as-is.
- An installment that a refund reopened returns to `Partial` or `Unpaid`
  automatically (§3.3 step 5).

---

## 7. Scenarios (Playwright + component)

| #   | Given                                            | When                                                  | Then                                                                                        |
| --- | ------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| S1  | admin on a booking, schedule 2 × $2,700          | records a $2,700 Check applied to installment 1       | installment 1 `Paid`; Received $2,700; history shows one Check row with the check number    |
| S2  | same, no schedule                                | records a $500 ACH, unapplied                         | Received $500; Balance Due drops by $500; no schedule table                                 |
| S3  | a $2,700 Check already recorded                  | records **−$2,700** Check, same installment, NSF note | installment 1 back to `Unpaid`; Received $0; two rows, one green one red                    |
| S4  | $1,500 recorded by typo (meant $150)             | records −$1,500 then $150                             | Received $150; three rows visible; nothing was edited or deleted                            |
| S5  | schedule 2 × $2,700, both paid                   | records −$1,000 unapplied                             | installment 2 becomes `Partial $1,700 of $2,700`; installment 1 untouched (reverse un-fill) |
| S6  | Amount field                                     | user types `0`                                        | inline error, submit disabled, no write                                                     |
| S7  | Amount field                                     | user types `-50`                                      | red amount, warning line, button reads "Record Refund / Adjustment"                         |
| S8  | account_manager on another AM's quote            | opens the Billing tab                                 | button disabled with an explanatory title; no dialog                                        |
| S9  | viewer                                           | opens the Billing tab                                 | no button at all; history is fully readable                                                 |
| S10 | offline (PowerSync disconnected)                 | records a Check                                       | row appears immediately in history; uploads on reconnect                                    |
| S11 | a Stripe payment and a manual check on one quote | opens Billing                                         | both rows listed, correctly typed; totals include both                                      |

---

## 8. Edge cases

- **E1 — negative beyond the schedule.** Refunds exceeding everything allocated
  leave `unallocatedCents` negative and `totalReceivedCents` possibly negative. Both
  are displayed, neither is clamped in the data. Only the payment-accounting-truth
  §6.1 "Balance Due floored at $0" display rule clamps, and only for overpayment.
- **E2 — negative applied to an installment with nothing on it.** `allocated`
  clamps at 0 and the surplus negative spills into the pool (§3.3 step 3), reopening
  later installments. No installment ever shows a negative allocation.
- **E3 — dangling `installment_id` after a schedule edit.** Inherited: treated as
  untargeted. Note that payment-accounting-truth E5 (the FK violation when deleting
  a paid installment) becomes **more** likely once staff can attach payments to
  installments by hand. It is a prerequisite, not a nice-to-have; if E5 is still
  open when this ships, `Apply To` must be limited to installments with no
  referencing payments, or the schedule editor will start throwing for accounting.
- **E4 — future-dated `paidAt`.** Rejected in the dialog. A payment received
  tomorrow is not received.
- **E5 — currency.** The dialog uses `useEventCurrency`; no picker. A row can only
  be entered in the event's currency, which keeps the currency-blind allocation
  honest.
- **E6 — double submit.** The submit button is disabled for the duration of the
  transition, and the insert carries a client-generated `id`, so a retried upload is
  an idempotent upsert rather than a second payment.
- **E7 — ACH that later fails.** Out of scope as a lifecycle; expressed as a
  negative row. The dialog's ACH hint says so, so accounting is not left guessing.
- **E8 — PowerSync upload rejected by RLS.** The connector treats a `42501` as
  fatal and _discards_ the transaction
  ([BackendConnector.ts:118](../../src/lib/powersync/BackendConnector.ts)) — the row
  would vanish from local state with no user-visible error. Since the dialog is only
  reachable by roles the policy allows, this means a genuine bug rather than normal
  denial; it must be surfaced with an error toast rather than swallowed. Confirm the
  connector's behavior during T4 and add the toast path if it is missing.
- **E9 — a manual row and the Stripe webhook racing on one installment.** Both write
  `PaymentHistory`; allocation is computed from the full set at read time, so the
  order does not matter. The webhook's installment-status write is a cache
  (payment-accounting-truth §3.2) and self-heals.
- **E10 — clock skew on `created_at`.** History sorts by `paid_at` with `created_at`
  as the tiebreaker, so two rows entered in the same second still order stably.

---

## 9. Permissions

`permissionPageData.ts` gets a **new** entry, "Record a Payment", category "Day to
Day Operations". The read-only entry proposed in payment-accounting-truth §9 is
updated in the same commit rather than duplicated — the note there says manual entry
is unavailable to everyone, and that stops being true.

| Role            | Level  | Note                                                                                                                                                                                                       |
| --------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin           | full   | Can record a card, ACH or check payment on any quote or booking, including a negative amount for a refund or correction. Cannot edit or delete a recorded payment — corrections are entered as a negative. |
| account_manager | custom | Same, but only on quotes they can already edit — the ones they created. On other quotes the button is disabled.                                                                                            |
| viewer          | none   | Can read the payment history but sees no button.                                                                                                                                                           |
| developer       | none   | No access to quotes.                                                                                                                                                                                       |
| driver          | none   | Driver Mobile App only.                                                                                                                                                                                    |

Wording is aimed at the account managers who actually read `/permissions`, so it
says what they can do and — because it will be the first question — that a mistake
is fixed by entering a negative, not by deleting.

---

## 10. TDD plan (implementation order)

Red → green → refactor. Every task starts from a failing test.

**T0 — pre-check (blocking, §4.4).** Confirm `PaymentHistory` is in the PowerSync
sync rules _and_ that a client insert reaches Postgres. Manual entry does not
proceed until this is yes. Record the answer here.

**T1 — `parseAmountInput`.** `utils/parseAmountInput.test.ts`, first and failing:
`"12.34"` → 1234; `"-12.34"` → −1234; `"(12.34)"` → −1234; `"1,234.56"` → 123456;
`"$-5"` → −500; `"0"` / `"0.00"` / `"-0"` → `zero`; `""` → `empty`; `"abc"`,
`"1.2.3"`, `"--5"` → `not-a-number`; `"12.345"` → rounds to 1235 (half-up, stated);
`"9999999"` → `too-large`. Float drift (`0.1 + 0.2`) must not appear — parse to
integer cents without floating multiplication where avoidable.

**T2 — `allocatePayments` with negatives.** Extend the existing suite; the
all-positive cases must stay green untouched (that is the regression guard). New,
red first: S3, S4, S5 as unit cases; a negative targeted at an empty installment
(E2); a refund larger than everything received (E1, negative
`totalReceivedCents` and negative `unallocatedCents`); reverse un-fill order
asserted explicitly (latest due date reopens first); ordering independence and
purity re-asserted with mixed signs.

**T3 — migration + RLS.** SQL-level: insert as `admin` succeeds; as `viewer` fails;
`amount_cents = 0` rejected; `entry_source = 'stripe'` from a client rejected;
`entry_source = 'manual'` without `recorded_by_user_uuid` rejected; UPDATE and
DELETE rejected for every role. Then `npm run gtl` and `AppSchema.ts` (§4.4).

**T4 — `recordManualPayment`.** Writes the expected row shape; sets
`status: "succeeded"`, `entry_source: "manual"`, a client-generated `id`;
propagates a rejected upload as an error the caller can toast (E8).

**T5 — `RecordPaymentDialog`.** Component tests first: S6 and S7 (zero rejected;
negative shows the warning and the changed button label); each of the three types
writes its own `payment_method_type` with the right Reference label; future date
rejected (E4); double submit writes once (E6); Apply To defaults to unapplied.

**T6 — `BillingTab` integration.** S1, S2, S3, S8, S9, S11 at component level:
negative rows render red with a minus sign; the Type and Recorded by columns; the
button's three role states.

**T7 — `permissionPageData.ts`** (§9), same commit as T6.

**T8 — webhook** (§4.3): the inserted row carries `entry_source: "stripe"` and
`payment_method_type: "stripe"`, with the Stripe method detail in `reference`.
Existing webhook tests stay green.

### Playwright

**Runs, unlike payment-accounting-truth's.** Manual entry is reachable entirely
through the UI with no Stripe redirect, so S1–S3 and S8–S9 are real e2e specs:
`recordPayment.admin.spec.ts`, `recordPayment.am.spec.ts`,
`recordPayment.viewer.spec.ts`. They need a seeded quote with a payment schedule in
`seed.sql`; if one is not already there, adding it is part of T6 and requires
`npx supabase db reset`. S10 (offline) stays out of Playwright — driving PowerSync's
connection state from a browser test is not worth its flake cost; it is covered at
the hook level in T4.

---

## 11. Sequencing note

If manual entry must ship **before** payment-accounting-truth, then the strict
minimum from that spec still has to come with it: `allocatePayments` and the
`BillingTab` read path. Without them a hand-entered payment writes a correct row
into a table the Billing tab does not read, and accounting sees the button do
nothing — the same complaint, one layer deeper. Shipping the write without the read
is not an option, and the two specs share the allocation function precisely so this
does not have to be decided twice.

---

## 12. Definition of Done

- [ ] T0 answered and written into §4.4
- [ ] `npm run tc`
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run test:e2e` — RUN (admin / am / viewer projects), §10
- [ ] `npm run gtl` after the migration (§4.4)
- [ ] `permissionPageData.ts` updated in the same commit (§9)
- [ ] payment-accounting-truth §6.3 ("+ Record Payment stays disabled") superseded
      and edited there, so the two specs do not contradict each other
