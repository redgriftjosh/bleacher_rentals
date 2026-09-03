# Defects: Manual Payment Entry — findings from the review of `manual-payment-entry.md`

Status: **MOSTLY FIXED** — raised 2026-09-04, fixed the same day.
D1, D2, D4, D5, D6, D8 and D9 are closed in code; D3 and D7 are corrected in the
specs they misdescribe. **D3's connector behaviour is still open** — see its entry.
Reviews: [manual-payment-entry.md](./manual-payment-entry.md) (APPROVED rev. 2.1)
Scope note: D9 is outside that spec — see its preamble
Code reviewed at: `7b025a6` plus the uncommitted working tree
(`BillingTab.tsx`, `usePaymentHistory.ts`, `formatDate.ts`, `permissionPageData.ts`,
`PaymentDetailDialog.tsx`, `describeAppliedTo.ts`)

> **This document was written to record defects only**, with no remedies, so
> that establishing a defect stayed separate from deciding what it was worth.
> That pass is done and the fixes have landed; each entry keeps its original
> finding and gains a **Fixed** note saying what changed. Where a fix deviated
> from what the entry implied, the note says so.

---

## 0. What was verified, and what held

Stated first, because the severity of everything below depends on knowing the
core is sound.

| Check                                         | Result                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run tc`                                  | clean                                                                        |
| `npx vitest run`                              | 1328 passing, 125 files                                                      |
| `npx prettier --check` on the feature's files | clean (the repo-wide 141 pre-existing failures are unrelated and documented) |
| `npm run test:e2e`                            | not run — excluded from this review by request                               |

`allocatePayments` was additionally exercised with 3 000 randomised mixed-sign
inputs (0–3 installments, 0–5 payments, amounts −$40…+$40, targets including
`null` and a dangling id). Every property the spec locks held on every case:

- `Σ parts[].cents + unallocatedCents === amountCents`, per payment, either sign (§3.4);
- `allocatedCents + unallocatedCents === totalReceivedCents`;
- `0 ≤ allocatedCents ≤ nominal` on every installment — no fourth state appears (§3.3 step 8);
- the parts credited to an installment across all payments sum to its `allocatedCents`;
- output is identical when installments and payments are fed in reverse order.

**No defect was found in the allocation core, in `parseAmountInput`, in
`recordPaymentForm`, or in the migration's constraints and RLS policy.** Every
defect below is at an edge: display, an unresolved input, or an interaction with
infrastructure outside this feature.

---

## D1 — A negative `Payments Received` renders green

**Severity: medium (wrong reading of the headline figure).**

Spec §6.5, first bullet:

> `Payments Received` may show a negative total; it is **rendered red rather
> than green** when it does, and never clamped to zero.

[`BillingTab.tsx:298`](../../src/features/quotesAndBookings/components/quoteDetail/tabs/BillingTab.tsx)
hard-codes the colour:

```tsx
<div className="flex justify-between text-green-600">
  <span>Payments Received</span>
  <span className="font-semibold">{formatMoney(receivedCents, currency)}</span>
</div>
```

There is no conditional on `receivedCents`. The same file gets it right one
screen further down — the history row at `:414` switches on
`p.amountCents < 0` — which is what makes the summary's omission read as an
oversight rather than a decision.

**How it fails.** An event whose refunds exceed its receipts (E1 — legitimate,
and the spec insists it is never clamped) shows `-C$1,000.00` in green, in the
row labelled "Payments Received", directly above a red "Balance Due". The minus
sign is the only signal, and it sits inside a colour that says the opposite.

**Not covered by any test.** `BillingTab.test.tsx` asserts the red on the
history row ("renders a refund in red with an explicit minus sign") and never
asserts the summary's colour, in either direction.

**Fixed.** The row switches on `receivedCents < 0`. Three tests in
`BillingTab.test.tsx` cover it — red when negative, the unclamped figure, green
in the ordinary case — and they read the summary row alone through a
`paymentsReceivedRow` helper, because the page carries deliberate green and red
elsewhere and a whole-document assertion would prove nothing.

---

## D2 — The dialog can write a currency that was never resolved

**Severity: medium (silent exclusion of a real payment from every total).**

This is the one defect that loses money quietly, which is the specific class of
failure §3.5 exists to prevent. Spec §3.5:

> Therefore `recordManualPayment` **must** write `useEventCurrency(eventId)` …
> Writing anything else puts accounting's check in the ledger, counts it as $0,
> and raises a banner blaming them for it.

The hook cannot honour that promise, because it discards the only signal that
says whether it knows the answer yet.
[`useEventCurrency.ts:33`](../../src/features/quotesAndBookings/hooks/useEventCurrency.ts):

```ts
const { currencyByOfficeId } = useOfficeCurrencies();
return pickEventCurrency(data?.[0]?.sales_office_uuid, currencyByOfficeId);
```

`useOfficeCurrencies` returns `{ currencyByOfficeId, isLoading }` and documents
the distinction itself — _"until the QBO currencies land, every office still
resolves — on its province — so a caller that renders anyway is showing a
fallback, not a final answer."_ `useEventCurrency` drops `isLoading` on the
floor. `pickEventCurrency` then falls back to `"USD"` for an unknown office, and
`resolveOfficeCurrency` falls back to the province for an office whose QBO
currency has not arrived.

Two things turn that from a display fallback into a write defect:

1. **`BillingTab` passes the value straight into the dialog** as
   `currency={currency}`, and `RecordPaymentDialog` passes it straight into
   `recordManualPayment`. Nothing between the hook and the `INSERT` asks whether
   the value is final.
2. **The QBO half is an online fetch.** `useOfficeCurrencies` reads
   `QboConnections` through `supabase.from(...)`, not through PowerSync — the
   comment says so: _"QboConnections aren't synced to PowerSync (tokens stay
   server-side)"_. So it does not merely resolve late; **offline it never
   resolves at all**, and the fetch's `error` branch only logs to the console.

**How it fails.** A sales office with a US or non-Canadian address whose
QuickBooks connection reports `CAD` resolves to `USD` until (and unless) the
online fetch lands. A check recorded in that window is written `currency: "USD"`
on a CAD event. `allocatePayments` then excludes it by currency: it contributes
$0 to `totalReceivedCents`, moves no installment, and appears in the amber
banner as a payment staff must "reconcile by hand". The row is permanent — the
ledger is append-only (§3.2) and there is no UPDATE path — so the only expression
of the correction is a second offsetting row in the wrong currency plus a third
in the right one.

**Directly contradicts a stated goal.** S10 and §3.1 sell offline entry as a
reason to choose the local-first write path; offline is exactly the state in
which the currency is least trustworthy.

**Fixed, by making the omission impossible rather than by remembering not to make
it.** `useEventCurrencyState(eventId)` now returns `{ currency, isResolved }`,
where `isResolved` requires both the event row and the office currency map — QBO
fetch included — to have landed. `useEventCurrency` stays as the display half and
deliberately cannot tell a caller the difference.

`evaluateRecordPaymentForm`'s options went from optional to **required**, with
`currencyResolved` a required field: a caller that forgets it is now a compile
error rather than a silent fallback. Unresolved sets `currencyError`, blocks
`canSubmit`, and renders in amber rather than red — the user did nothing wrong
and can only wait. Four tests in `recordPaymentForm.test.ts`.

---

## D3 — E6's idempotency claim does not hold against the append-only RLS

**Severity: medium (false "not saved" alarm on a payment that was saved).**

Spec E6:

> the insert carries a client-generated `id`, so a retried upload is an
> **idempotent upsert** rather than a second payment.

The client-generated id is there —
[`recordManualPayment.ts`](../../src/features/quotesAndBookings/db/recordManualPayment.ts)
sets `id: crypto.randomUUID()` and a test asserts it. The upsert is there too:
[`BackendConnector.ts:89`](../../src/lib/powersync/BackendConnector.ts) replays a
`PUT` as `table.upsert(record)`. What is missing is the policy that an upsert
needs on its second run.

`supabase-js`'s `.upsert()` is `INSERT … ON CONFLICT DO UPDATE`. Postgres judges
the conflict branch of that statement against the table's **UPDATE** policies,
and §3.2/§4.4 deliberately create none, for anybody:

> No UPDATE and no DELETE policy is added. A row, once entered, is permanent.

So the two halves of the design are in tension: the ledger is append-only, and
the only writer the app has replays its writes as upserts.

**How it fails.** The row reaches Postgres and commits. The connector's
`await table.upsert(record)` then loses its response — a dropped connection, a
gateway timeout — and PowerSync retries the transaction, as it is designed to.
The retry's `ON CONFLICT` branch finds no UPDATE policy, is refused `42501`,
which is in `FATAL_RESPONSE_CODES`, so the connector discards the transaction and
fires the new toast: _"A change could not be saved and has been discarded …
Reload and check whether it is there; if not, please report this."_

The payment **was** saved. The user is told it was not, and the local row
disappears until the next sync brings the server's copy back. That toast is the
mitigation D-note E8 asked for, and this is the one path where it lies.

**Second-order:** the same reasoning applies to every future retry of any
`PaymentHistory` write, not just a manual one, because the restriction is on the
table rather than on this feature.

**Partly addressed — the code defect is still open, deliberately.** E6 in
`manual-payment-entry.md` no longer claims an idempotent upsert; it now states
what is actually guaranteed (a retry addresses the same primary key, so a payment
can never be duplicated) and records the `42501` discard as a known false alarm.

The connector itself is unchanged. Teaching it that a conflict on an append-only
table means "already applied" is a change to the write path of **every** table in
the app, and getting it wrong turns a real integrity violation into a silent
success — the opposite of what E8's toast was added for. That is a decision to
take on its own, not as a rider on a payments ticket. D9 removed the one caller
that provoked this in practice.

---

## D4 — The new `amount_cents <> 0` constraint can pin the Stripe webhook in a retry loop

**Severity: low (narrow trigger, unbounded consequence).**

The migration adds, correctly and by design:

```sql
alter table public."PaymentHistory"
  add constraint payment_history_amount_nonzero_check
  check (amount_cents <> 0);
```

The webhook that writes every Stripe row was not adjusted for it.
[`route.ts:119`](../../src/app/api/stripe/webhook/route.ts):

```ts
amount_cents: session.amount_total ?? 0,
```

The `?? 0` is a pre-existing defensive default that was harmless while the column
accepted any integer. It is no longer harmless: the value it produces is now the
one value the table refuses.

**How it fails.** A `checkout.session.completed` whose `amount_total` is `null`
or `0` — a fully discounted session, a zero-amount setup session, a Stripe
product change — hits `23514`. That is not `23505`, so the handler falls to its
generic branch and returns **500 so Stripe retries the delivery**. Stripe will
retry that event on its schedule for up to three days, and every attempt fails
identically, because the payload cannot change. The webhook endpoint's failure
rate rises, and Stripe may disable it.

Note the shape of it: the constraint is right, the `?? 0` is now wrong, and the
combination was introduced by this ticket. §4.5 revised the webhook's insert in
the same commit and touched the line two rows above this one.

---

## D5 — `intended_installment_id` is plumbed everywhere except the screen it was plumbed for

**Severity: low (a promised affordance is absent).**

Spec §4.3:

> `usePaymentHistory` does not select `intended_installment_id` today. It does
> not need to for allocation, but **§6.4's history table shows the original
> target when it differs from the live link**, so the hook gains that column.

And §6.4:

> Where `intended_installment_id` differs from `installment_id` (a schedule was
> rebuilt under the payment), the original target is shown as secondary text.

The plumbing shipped: the column is selected in
[`usePaymentHistory.ts`](../../src/features/quotesAndBookings/hooks/usePaymentHistory.ts),
mapped to `intendedInstallmentId`, and typed on `PaymentHistoryRow` with a
docstring. The consumer never arrived. A search across `src/` finds exactly one
other occurrence of the field, in a test fixture:

```
src/features/quotesAndBookings/components/quoteDetail/tabs/BillingTab.test.tsx:61:    intendedInstallmentId: null,
```

Neither `BillingTab.tsx` nor `PaymentDetailDialog.tsx` reads it — and the detail
dialog is the natural home for it, being the place §6.4's other overflow went.

**How it fails.** After a schedule rebuild re-points `installment_id`, the
Billing tab shows the payment against its new installment with nothing to say it
ever pointed elsewhere. The historical fact is in the database, syncs to the
client, is loaded into the component's props, and is then dropped on the floor —
which is the specific reconstruction problem the column was added to solve
(migration `20260902120000`).

**Fixed, in the detail dialog rather than the table — a deliberate deviation from
§6.4.** The reading is a new `describeOriginalTarget` beside `describeAppliedTo`,
returning null while the two columns agree (almost always) so no payment carries
a redundant second line, and distinguishing a target still on the schedule from
one that is gone. Five tests.

It renders under **Applied To** in `PaymentDetailDialog`, not as secondary text
in the history table. §6.4 asks for the table, but the Applied To cell was
already trimmed to two lines precisely because it was squashing every other
column (`APPLIED_TO_PREVIEW_PARTS`); a third line there would rebuild the problem
that trimming solved. The dialog is where §6.4's other overflow already went.

---

## D6 — `recordManualPayment` casts its insert to `any`

**Severity: low (the guard rail is off at the one place the spec says it matters).**

[`recordManualPayment.ts:86`](../../src/features/quotesAndBookings/db/recordManualPayment.ts)
ends its `.values({ … })` with `} as any)`.

CLAUDE.md's PowerSync rule states the purpose of the typing it defeats:
_"`expect<T>()` is mandatory — it forces TS to break when the schema changes."_
The same intent applies to the write half: the compiled Kysely insert is what
notices when a column is renamed, retyped, or dropped.

The cast is understandable — this file writes ten columns including three added
in the same commit, and the local schema stores booleans as `0/1`, which is the
usual reason a cast appears in this codebase. Understandable is not the same as
sound.

**How it fails.** A future migration that renames `entry_source`, retypes
`amount_cents`, or drops `reference` compiles clean here. The row then goes to
the local DB with a column the schema does not have, and its upload is rejected
by PostgREST with a `42P01`/`42703`-family code. `FATAL_RESPONSE_CODES` includes
`/^42501$/` only, so that particular code would be treated as retryable and block
the queue instead of being discarded — a different failure, but still one that
`tsc` was supposed to catch a release earlier.

**Contrast:** `db/setEventIsQbo.ts` and `db/paymentInstallments.ts`, the two
nearest write paths, are cited by the spec as the shape to follow.

**Fixed, and the cast turned out to be unnecessary.** Deleting `as any` left
`npm run tc` clean — nothing about the ten columns needed it. Confirmed the guard
is now live rather than merely restored: renaming `entry_source` to
`entry_source_typo` in that literal produces `TS2353` naming the column, which is
exactly the break the schema typing exists to cause.

---

## D7 — §3.4's "Correction" paragraph describes behaviour the code does not have

**Severity: low (documentation defect, and the spec is the artefact under review).**

Not a code defect — the code is better than the text. Recorded because the spec
is APPROVED and someone will read that paragraph as the contract.

§3.4 states, under **"Correction, from the implementation (2026-09-03)"**:

> A refund names an installment only when it was **targeted** at one. An
> _untargeted_ refund reads "Unapplied (−$1,000)" even when the balance visibly
> moved, and that is correct rather than a gap.

`distributePool` in
[`allocatePayments.ts`](../../src/features/quotesAndBookings/utils/allocatePayments.ts)
does the opposite, and says so in its own docstring: _"Contributions are consumed
in canonical order against the same installment deltas the walk above produced,
so a refund that reopened an installment names it with a negative figure rather
than reading as 'unapplied'."_

Confirmed by running S5 (§7) — two installments of $2 700 both paid, then an
**untargeted** −$1 000:

```
byPayment: [
  { paymentId: "A", parts: [{ installmentId: "i1", cents:  270000 }], unallocatedCents: 0 },
  { paymentId: "B", parts: [{ installmentId: "i2", cents:  270000 }], unallocatedCents: 0 },
  { paymentId: "R", parts: [{ installmentId: "i2", cents: -100000 }], unallocatedCents: 0 },
]
```

The refund names installment 2, with a negative figure, exactly as the untargeted
case in the paragraph says it will not. The reasoning the paragraph gives (that a
netting-positive pool reopens nothing, so there is nothing to name) is still
sound; it is the flat claim about untargeted refunds that no longer matches.

**Fixed in the spec, not the code — the code was right.** §3.4's paragraph now
states the rule the implementation actually follows: a refund names the
installment it reopened whether or not it was targeted, and the real distinction
is **whether an installment moved at all**, not whether the refund named one. The
old note's reasoning is kept, reattached to the case it was really about (a pool
that nets out positive, where nothing was reopened).

---

## D8 — `Record a Payment` gives `viewer` the level `read`, where §9 specifies `none`

**Severity: cosmetic, on a page users read.**

§9's table for the new entry:

| Role   | Level  | Note                                             |
| ------ | ------ | ------------------------------------------------ |
| viewer | `none` | Can read the payment history but sees no button. |

[`permissionPageData.ts`](../../src/features/userAccess/permissionPageData.ts)
ships `read(...)` instead:

```ts
viewer: read("Can read the payment history but sees no button — there is nothing to press."),
```

The prose is right and better than the spec's. The level is not: on a permission
whose subject is _recording_ a payment, `read` claims a viewer has some partial
access to the action, when the accurate answer — and the one the button's absence
implements — is that they have none. Their ability to read the ledger is already
stated by the separate "Payment History" entry immediately above.

`/permissions` is read by account managers, and the level chip is the part they
scan.

**Fixed.** The level is `none`. The note was rewritten to match the chip rather
than argue with it: _"No. Reading the payment history is a separate thing, and
they can still do that."_

---

## D9 — Creating a quote races the server's auto-subscribe trigger, and loses

**Severity: medium (a phantom "could not be saved" on a quote that saved fine).**

**Not a manual-payment-entry defect.** It is recorded here because it is D3's
mechanism firing on a second table, in a flow that ships today, and because the
toast that makes it visible to users arrived with this ticket. Before E8's toast
the discard was silent; now every quote creation can end in an error message
about a quote that was created correctly.

### The race

1. [`createQuoteEvent.ts:76`](../../src/features/quotesAndBookings/db/createQuoteEvent.ts)
   calls `subscribeToEvent(eventUuid, ownerUserUuid)` right after inserting the
   `Events` row locally.
2. [`subscriptions.ts:8`](../../src/features/eventChat/db/subscriptions.ts) checks
   for an existing subscription first — but it can only check the **local** DB,
   where there is genuinely none — and then inserts with its own
   `id = crypto.randomUUID()` (call it **A**).
3. The connector uploads CRUD ops in order
   ([`BackendConnector.ts:88`](../../src/lib/powersync/BackendConnector.ts)), so
   the `Events` upsert goes first.
4. That INSERT fires `events_auto_subscribe_owner`
   ([20260709120000](../../supabase/migrations/20260709120000_event_owner_auto_subscribe_chat.sql)),
   which inserts the subscription itself, with `gen_random_uuid()` (**B**), for
   the same `(event_uuid, user_uuid)`.
5. Row A is uploaded next. `supabase-js`'s `.upsert()` resolves conflicts on the
   **primary key only**, and A ≠ B, so it is a plain INSERT — which violates
   `EventSubscriptions_event_uuid_user_uuid_key`
   ([20260702120000:28](../../supabase/migrations/20260702120000_event_subscriptions_user_uuid.sql))
   → `23505`.
6. `^23...$` is in `FATAL_RESPONSE_CODES`
   ([`BackendConnector.ts:12`](../../src/lib/powersync/BackendConnector.ts)), so
   the transaction is discarded and the user is shown _"A change could not be
   saved and has been discarded."_

The trigger is idempotent (`ON CONFLICT (event_uuid, user_uuid) DO NOTHING`) and
the client function is idempotent against local state. Neither is idempotent
against the other, because they agree on the natural key and disagree on the
primary key — and the upload path only knows the primary key.

### What is actually lost

Nothing, in this flow — and it is worth being exact, because the instinct is to
assume worse. The `Events` row uploaded before the failure, and the subscription
exists on the server as B. The user sees an error about a quote that was created
correctly and fully subscribed.

The blast radius is one CRUD op rather than the rest of the queue:
`getCrudTransactions` groups `ps_crud` rows by `tx_id`, and every write in this
codebase goes through `typedExecute` → `powerSyncDb.execute`, which is its own
implicit transaction — `writeTransaction` appears nowhere in `src/`. So the
`Events` insert and the subscription insert are **separate** CRUD transactions,
and `transaction.complete()`'s `DELETE FROM ps_crud WHERE id <= ?` takes only the
failing one. That is luck rather than design: the moment any write path batches
two statements into one `writeTransaction`, everything after the failing
statement in that batch is discarded with it.

The residue is local: row A sits in the local DB until the next sync replaces it
with the server's B.

### The same rake, elsewhere

- [`updateQuoteEvent.ts:177`](../../src/features/quotesAndBookings/db/updateQuoteEvent.ts) —
  the trigger is `AFTER INSERT OR UPDATE OF created_by_user_uuid`, and this line
  calls `subscribeToEvent` on exactly the condition that fires it
  (`newOwnerUuid !== oldEvent?.created_by_user_uuid`). Identical race, on owner
  change.
- [`useAutoSubscribeEventOwner.ts:47`](../../src/features/eventChat/hooks/useAutoSubscribeEventOwner.ts) —
  fires whenever an owner opens an event whose subscription row exists on the
  server but has not yet synced locally. Its `subscribedRef` guard is per-mount,
  and the `existing` check inside `subscribeToEvent` sees local state only.
- [`EventChatMembersModal.tsx:90`](../../src/features/eventChat/components/EventChatMembersModal.tsx)
  and
  [`EventInternalChat.tsx:429`](../../src/features/eventChat/components/EventInternalChat.tsx) —
  same exposure whenever the target user is already a member server-side and the
  row has not arrived locally.

### Why it is a defect and not a tolerable duplicate

Two writers create the same logical row, by two different identities, and the
transport can only reconcile one of them. `subscribeToEvent`'s docstring claims
_"idempotent — safe if already subscribed"_, which is true of the local database
and false of the server it uploads to. The client and the trigger are each
correct alone; the defect is that both are wired to the same event with no shared
notion of the row's identity.

**Fixed by removing the duplicate writer, not by teaching the two to agree.**
Of the three fix directions considered, this is the one that removes the
duplicated responsibility rather than adding machinery to coordinate it; the
trigger is already idempotent on the natural key, which the client can never be.

Removed:

- `createQuoteEvent.ts` — the trigger fires on this very INSERT.
- `updateQuoteEvent.ts` — the trigger fires on `UPDATE OF created_by_user_uuid`,
  under exactly the condition this call was guarded by.
- `useAutoSubscribeEventOwner` — deleted outright, with its call in
  `EventInternalChat`. It re-asserted the owner's subscription on every chat
  open, which the trigger, its `UPDATE` branch and that migration's backfill
  already cover between them. It was also quietly undoing "leave chat" for the
  one person most likely to want it: an owner who left was re-subscribed the next
  time they opened the chat. An owner who leaves now rejoins with the Join
  button, like anyone else.

**Left in place, knowingly:** `EventChatMembersModal` and `EventInternalChat`'s
`handleJoinChat`. Those add **other** users, which no trigger does, so they are
the only writer for that row and cannot simply be deleted. Their narrower
exposure — the row exists server-side but has not synced locally yet — is the
same shape as D3 and wants the same connector-level answer.

---

## 9. Deviations examined and found acceptable

Recorded so a later reader does not re-open them.

- **"Recorded by" is a sub-line, not a column** (§6.4 asks for a column).
  `BillingTab.tsx` renders `via {recordedByName(p)}` under the payer, with a
  comment giving the reason — the column cost width the amount columns needed.
  A deliberate, documented, visible-in-review trade.
- **`describeAppliedTo.showAmounts` carries a third condition**
  (`|| payment.amountCents < 0`) beyond §3.4's two. It makes a single-part refund
  spell its figure out, which the spec wants and its stated condition would have
  missed.
- **S2 has no Playwright spec**, only unit coverage, though §10 lists "S1–S3, S9
  and S13" as e2e. S2 (a payment with no schedule) is a pure allocation question
  and is covered in `allocatePayments.test.ts` and `BillingTab.test.tsx`.
- **`computeAmountDue` shows a negative `paidCents` to a client** on the public
  Pay tab. `remainingCents`, `overdueOwedCents` and `defaultPayCents` are all
  floored at 0, so nothing chargeable goes negative; §6.5 scopes the display rule
  to the staff Billing tab, and the public page is out of scope per §1.
- **`allocatePayments.test.ts` still asserts "counts a zero-amount payment
  without affecting anything"**, a row the database now refuses. Harmless as a
  property of a pure function.

---

## 10. Definition of Done, as it actually stands

Carried from `manual-payment-entry.md` §11, with what this review could confirm.

- [x] `npm run tc` — clean
- [x] `npm run test` — 1328 passing, 125 files
- [x] `permissionPageData.ts` — both edits present (level defect at D8)
- [x] payment-accounting-truth §6.3 marked superseded — **done**, though the
      spec's own checkbox is still unticked
- [ ] `npm run lint` — red repo-wide (141 pre-existing files); every file this
      ticket touched passes
- [ ] `npm run test:e2e` — not run; excluded from this review by request
- [ ] `npm run test:db:payments` — not run in this review; the script and
      `supabase/tests/manual_payment_entry.test.sql` both exist and cover T1–T7
- [ ] End-to-end confirmation that an admin's Clerk JWT satisfies
      `payment_history_insert` against the deployed backend — still not
      establishable from the repository
