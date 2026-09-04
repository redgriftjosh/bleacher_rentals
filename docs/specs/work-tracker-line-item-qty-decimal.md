# Work tracker line item quantity as a decimal (`WorkTrackerLineItems.qty_decimal`)

## Why

`WorkTrackerLineItems.quantity` is an `integer`. Real work does not arrive in
whole units: half a day of setup, 2.5 hours of maintenance, 1.5 loads of
deadhead. Today every one of those has to be rounded by the person entering it,
and the pay computed from it is wrong by up to half a unit times the rate.

`quantity` cannot simply change type: shipped builds of the driver app
(`br_driver`) still read it to render the pay breakdown. So `quantity` stays,
becomes **deprecated**, and is kept in sync by a database trigger — exactly the
shape already used for `Drivers.tax_dec` (see
[driver-tax-decimal.md](driver-tax-decimal.md)).

## 1. Database (Supabase)

New migration `supabase/migrations/20260906120000_work_tracker_line_item_qty_decimal.sql`:

```sql
alter table public."WorkTrackerLineItems"
  add column if not exists qty_decimal numeric(10,1) not null default 1;

-- Back-fill from the integer column, once, for rows that predate it.
update public."WorkTrackerLineItems"
   set qty_decimal = quantity
 where qty_decimal = 1
   and quantity <> 1;

alter table public."WorkTrackerLineItems"
  add constraint work_tracker_line_items_qty_decimal_check check (qty_decimal >= 0);

comment on column public."WorkTrackerLineItems".qty_decimal is
  'Line quantity, 1 decimal (e.g. 2.5 hours). The real quantity.';

comment on column public."WorkTrackerLineItems".quantity is
  'DEPRECATED - whole-unit mirror of qty_decimal, kept for shipped br_driver builds. Maintained by sync_work_tracker_line_item_qty(); write qty_decimal instead.';
```

`numeric(10,1)` → exactly 1 digit after the point, up to `999999999.9`. The
existing `quantity >= 0` check stays; the new column gets the matching one.

### Trigger `sync_work_tracker_line_item_qty`

`before insert or update on "WorkTrackerLineItems"`, `for each row`:

| Case                                        | Effect                                |
| ------------------------------------------- | ------------------------------------- |
| `qty_decimal` changed (new value written)   | `quantity := round(qty_decimal)::int` |
| only `quantity` changed (legacy/API writer) | `qty_decimal := quantity`             |
| neither changed                             | no-op                                 |

On `insert`, a `qty_decimal` different from the default wins; otherwise a
non-default `quantity` seeds `qty_decimal`.

The second row is what stops an old client, or a hand-written SQL update, from
leaving the pair inconsistent. New code never writes `quantity` itself.

> **Decision to confirm — rounding.** You wrote "число до крапки" (truncate)
> and then "типу будем заокруглювати" (round). This spec uses `round()`,
> half-up, to match `sync_driver_tax()`: `2.5 → 3`, `2.4 → 2`. Note the
> consequence either way: a `0.5` line shows as `1` (round) or `0` (trunc) to
> old app builds, so their breakdown is by design slightly wrong — that is what
> makes them legacy. Say the word and it becomes `trunc()`; it is one line.

## 2. PowerSync

SQLite has no `DECIMAL`. In both `AppSchema.ts` files (web
`src/lib/powersync/AppSchema.ts`, mobile `library/powersync/AppSchema.ts`):

```ts
quantity: column.integer,   // DEPRECATED — mirror of qty_decimal
qty_decimal: column.real,
```

`column.real` is the float column PowerSync casts the Postgres `numeric` into,
so it reads back as `number | null` — the same convention the architecture doc
sets out for booleans-as-0/1.

**Sync rules — verified, no action needed.** Every `WorkTrackerLineItems` bucket
in `br_powersync/config/sync_rules.yaml` (viewer, account manager, admin, and
the mobile driver bucket) already selects `"WorkTrackerLineItems".*`, so
`qty_decimal` reaches every client with no rule change. This corrects the
earlier draft of this spec, which assumed the columns were listed explicitly.

`database.types.ts` is regenerated with `npm run gtl` in the web repo. The
mobile repo has no type-generation script, so its copy is edited by hand.

## 3. Types

`DraftWorkTrackerLineItem.quantity: number` → **`qtyDecimal: number`**
(`src/features/workTrackers/db/workTrackerLineItems.ts`). A field named
`quantity` must no longer mean "the line's quantity", so nobody has to guess
which column fed it — same rule applied to `tax` → `taxDec`.

The internal `Row` type in that file follows: `qty_decimal: number | null`.

`EventLineItems.quantity` is a **different table** and is entirely out of scope.
Nothing under `src/features/quotesAndBookings/`, `eventConfiguration/`,
`dashboard/`, or the Stripe/quote routes changes.

## 4. UI

`WorkTrackerLineItemsTab.tsx` currently uses `parseInt` and `step="1"`, so a
decimal cannot be entered at all. Both the edit row and the add row switch to a
new extracted pure helper, mirroring `sanitizePercentInput`:

`src/features/workTrackers/components/quantityInput.logic.ts`

```ts
export const MAX_QUANTITY_DECIMALS = 1;
export type SanitizedQuantity = { display: string; value: number };
export function sanitizeQuantityInput(raw: string): SanitizedQuantity;
```

- accepts one `.` or `,` (normalised to `.`), at most 1 decimal;
- rejects a negative (the `-` is simply stripped, matching the `>= 0` check);
- keeps a trailing `.` while typing (`"2."` stays `"2."`, value `2`);
- empty → `{ display: "", value: 0 }`.

The `<input>` becomes `type="text"` `inputMode="decimal"` (a `number` input's
`step` validation fights half-typed values) with `aria-label="Quantity"`, which
is what the Playwright spec locates it by.

Write and read sites switched to `qty_decimal` / `qtyDecimal`:

- `fetchWorkTrackerLineItems` — selects `qty_decimal`.
- `syncWorkTrackerLineItems` — inserts `qty_decimal`, **not** `quantity`.
- `calculateWorkTrackerLineItemsTotalCents` — multiplies by `qtyDecimal`.
- `reconcileRequirementLineItems` — seeds `qtyDecimal: 1`.
- `WorkTrackerModal.tsx` — the four auto-managed Hauling/Deadhead literals.
- `WorkTrackerLineItemsTab.tsx` — both rows, plus the line-total display.

`Math.round(qtyDecimal * unitAmtCents)` already guards the cents total against
float dust from `2.5 * 1999`; it stays.

## 5. Mobile app (`br_driver`)

- `library/powersync/AppSchema.ts` — add `qty_decimal: column.real`.
- `hooks/db/useWorkTrackerLineItems.ts` — select `qty_decimal`, and the
  `WorkTrackerLineItem` type carries `qty_decimal: number | null`.
- `utils/lineItems.ts` — `lineItemTotalCents` reads `qty_decimal`; it also gains
  the same `Math.round` guard, since `1.5 * 1999` is no longer an integer.
- `components/widgets/payBreakdown.tsx` — the `{quantity} × {rate}` line renders
  `qty_decimal`, formatted so `2` shows as `2` and `2.5` as `2.5`.

Per your instruction, `quantity` is replaced everywhere in that repo — after
this change no `br_driver` source file reads it.

## 6. Permissions

No role gains or loses an ability: the same people who could edit work tracker
line items can edit the quantity, and drivers still only read it.
`permissionPageData.ts` needs no change.

## 7. Tests

| Level      | File                                                         | Covers                                                                                                                 |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| pgTAP      | `supabase/tests/work_tracker_line_item_qty_decimal.test.sql` | column type/scale; `2.5` → `quantity = 3`; legacy `quantity` write back-fills `qty_decimal`; insert path; `>= 0` check |
| Vitest     | `quantityInput.logic.test.ts`                                | `sanitizeQuantityInput` — decimals, 1-place cap, comma, trailing dot, empty, negative                                  |
| Vitest     | `workTrackerLineItems.test.ts`                               | total in cents with fractional quantities; `reconcileRequirementLineItems` seeds `qtyDecimal`                          |
| Vitest     | `utils/__tests__/lineItems.test.ts` (mobile)                 | `lineItemTotalCents` on `qty_decimal`, fractional and null                                                             |
| Playwright | `workTrackers/e2e/lineItemQuantity.admin.spec.ts`            | adding a line with Qty `2.5` in the Line Items tab, saving, and reading it back after a reload                         |

## Edge cases

- **Offline write** — PowerSync queues the `qty_decimal` update; the trigger runs
  when it reaches Postgres, so `quantity` lags for old clients exactly as long
  as the sync does. Acceptable: `quantity` is deprecated.
- **Old client writes `quantity`** — covered by the reverse branch of the
  trigger.
- **`0.5` seen by an old build** — rounds to `1` (see the decision box above).
- **Float representation** — `qty_decimal` arrives in SQLite as a float, so
  `0.1 + 0.2` style dust is possible in a sum. Every money figure is computed as
  `Math.round(qty * cents)` and stored as integer cents, so no dust reaches the
  database.
- **Existing rows** — back-filled from `quantity`; the `where qty_decimal = 1`
  guard makes the migration re-runnable, and matches the `default 1` that the
  table already used for `quantity`.
- **The `quantity >= 0` check** — unchanged, and the trigger can only ever write
  a rounded non-negative value into it, so it cannot be violated from the new
  path.

## Found while building — not fixed here

**A line-item-only edit cannot be saved.** `handleSaveClick` decides whether
there is anything to save from `buildWorkTrackerSnapshot`, which covers work
tracker _fields_ only — line items are not in it. So adding, removing, or
retyping a line item and pressing Save on an existing tracker is refused with
"No changes to save.", and the edit is lost when the modal closes.

This predates this change and applies equally to the old integer `quantity`; it
is not a regression. Creating a new work tracker is unaffected (`isNew` forces
the change type to `un-accept`), which is why the Create flow in the original
request works. The Playwright spec above works around it by also touching
Internal Notes. Worth its own fix: the snapshot should include the line items,
or the save gate should consider them separately.

## Out of scope

- `EventLineItems.quantity` (quotes, contracts, Stripe checkout) — a different
  table, untouched.
- The QuickBooks bill routes build lines from work tracker **totals**, not line
  item quantities, and need no change.
