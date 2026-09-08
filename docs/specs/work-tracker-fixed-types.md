# Work Tracker Fixed Types

## Status

Draft — awaiting approval.

## Problem

Work tracker "types" (`WorkTrackerTypes`) are currently free-form: any user can add,
rename, reorder, or delete a type from [`EditWorkTrackerTypesModal.tsx`](../../src/features/workTrackers/components/EditWorkTrackerTypesModal.tsx).
Production data has drifted to 8 distinct display names (`Trip`, `Repair/Maintenance`,
`Cleaning`, `Site Visit`, `Set up`, `Hotel/ Per Diem`, `Tear down`, `Deadhead` — see
`supabase/seed.sql` around line 13743), and [`WorkTrackerModal.tsx`](../../src/features/workTrackers/components/WorkTrackerModal.tsx)
shows the same Pickup + Dropoff field set for every type regardless of what it
actually needs.

We want exactly **3** types, each with its own field layout:

1. **Trip** (default) — the current behavior: separate Pickup and Dropoff sections,
   each with Time, POC, Address, Instructions, plus Teardown Required (pickup side)
   and Setup Required (dropoff side).
2. **Repair / Maintenance** — a single set of fields (Time, POC, Address,
   Instructions). No Pickup section. Written to the existing `dropoff_*` columns.
3. **Site Visit / Cleaning / Other** — identical field layout to Repair/Maintenance,
   but with its own QuickBooks account per connection (the mapping mechanism this
   needs already exists — see below).

## What already exists (no new work)

- **Per-connection QBO account mapping** is fully built and live:
  `WorkTrackerTypeQboAccounts` (migration `20260226223420_paying_drivers.sql:335`),
  edited in `EditWorkTrackerTypesModal.tsx`, and consumed at bill-creation time in
  [`src/app/api/quickbooks/create-bill/route.ts:190-264`](../../src/app/api/quickbooks/create-bill/route.ts)
  — it already blocks bill creation with a clear error if a type has no account
  assigned for the connection being billed. This spec does not touch that logic,
  only which types exist to assign accounts to.
- `WorkTrackers.work_tracker_type_uuid` FK to `WorkTrackerTypes.id` already exists.
- Soft-delete (`is_deleted`) on `WorkTrackerTypes` already exists.

## Data migration (Supabase)

New migration `supabase/migrations/<timestamp>_fixed_work_tracker_types.sql`:

1. Identify (or create, if missing in a given environment) exactly 3 canonical rows
   by `id`, keeping the **existing `Trip`** row's id (`642f6ff8-...` in the seed —
   actual id resolved at migration time, not hardcoded) so existing `Trip` work
   trackers keep their FK unchanged:
   - `Trip` (unchanged name)
   - `Repair/Maintenance` → rename display_name to `Repair / Maintenance`
   - `Cleaning` → rename display_name to `Site Visit / Cleaning / Other`
2. Reassign `WorkTrackers.work_tracker_type_uuid` for every row currently pointing
   at `Site Visit`, `Set up`, `Hotel/ Per Diem`, `Tear down`, or `Deadhead` to the
   renamed `Site Visit / Cleaning / Other` type's id.
3. Soft-delete (`is_deleted = true`) the now-orphaned type rows (`Site Visit`,
   `Set up`, `Hotel/ Per Diem`, `Tear down`, `Deadhead`) rather than hard-deleting,
   so `WorkTrackerTypeQboAccounts` history isn't lost and nothing FK-cascades.
4. Leave `WorkTrackerTypeQboAccounts` rows for the deleted types in place (harmless,
   unreferenced) — do not attempt to merge their account assignments; whoever owns
   `/permissions`-adjacent QBO config will need to re-check the `Site Visit /
Cleaning / Other` account assignment per connection after this migration, since
   it now represents a merged bucket. **Flag this explicitly to Josh post-migration.**
5. If any environment has _zero_ rows for one of the 3 canonical names (shouldn't
   happen given the seed data, but defensive), insert it fresh with the next
   `sort_order`.

After the migration, run `npm run gtl` to regenerate `database.types.ts`.

## App-layer lockdown: `EditWorkTrackerTypesModal.tsx`

Remove, entirely:

- "Add type" button/flow
- Delete (trash) button per row
- Reorder (chevron up/down) buttons
- The editable name `<input>` — display names become read-only labels

Keep:

- The 3 fixed rows, each showing its (relabeled) name and, per QBO connection, the
  existing `SelectQboAccountSimple` dropdown — this part is unchanged.
- Save button, now only writing to `WorkTrackerTypeQboAccounts` (no more
  insert/update/delete against `WorkTrackerTypes` itself, since names/order are
  fixed).

`classifyWorkTrackerTypes.ts` becomes unnecessary for this modal (no more
insert/update/delete branches) — delete it and its test, or leave it unused only if
something else still calls it (needs a grep check at implementation time).

Consider renaming the modal (and its "Edit types" trigger button in
`WorkTrackerModal.tsx`) to something like "Work Tracker QuickBooks Accounts" since
it's no longer about editing types — open question, see below.

## App-layer field logic: `WorkTrackerModal.tsx`

Add a derived value:

```ts
const selectedType = workTrackerTypes.find((t) => t.id === workTracker?.work_tracker_type_uuid);
const isSingleFieldSetType = selectedType?.display_name !== "Trip"; // Repair/Maintenance or Site Visit/Cleaning/Other
```

(Matching by display name is fragile long-term; better to match by the well-known
seeded id, resolved once via a small constants/lookup module, e.g.
`src/features/workTrackers/constants.ts`, exporting `TRIP_TYPE_ID` /
`SINGLE_FIELD_SET_TYPE_IDS` or similar — resolved from the DB at startup rather
than hardcoded strings, given ids are UUIDs generated per-environment. **Needs a
decision at implementation time**: either (a) look up by a fixed, migration-pinned
id per environment, or (b) keep matching on display_name since it's now fixed by
this spec and no longer user-editable. Recommend (b) for simplicity, revisit if it
becomes a real pain point.)

When `isSingleFieldSetType` is true:

- Hide the entire "Column 2: Pickup" block.
- "Column 3: Dropoff" becomes the single field set and is relabeled generically:
  `Pickup Time` → `Time`, `Pickup POC` → wait — **the single field set still
  physically uses the `dropoff_*` columns** per the product ask ("write to the
  drop off address"), so the visible column is the existing Dropoff column with
  its labels changed from `Dropoff Time` / `Dropoff POC` / `Dropoff Address` /
  `Dropoff Instructions` to `Time` / `POC` / `Address` / `Instructions`.
- The "Setup Required" checkbox (currently under Dropoff) stays; the "Teardown
  Required" checkbox (currently under Pickup) is hidden along with the rest of the
  Pickup column — open question below on whether Teardown Required should still be
  reachable somehow for these types.
- The map (`RouteMapPreview`) — currently plots pickup → dropoff — has no pickup
  leg to show. Hide it entirely for single-field-set types (there is no "distance
  traveled" to render), and skip the `/api/distance` query (`distanceQueryEnabled`)
  since `origin` will always be empty.
- Layout: with only one field column, the Dropoff column can take the full width
  freed by the removed Pickup column, or stay centered/narrower — implementation
  detail, no product requirement here.

No new required-field validation is added (matches current behavior — nothing is
hard-required today, including for Trip).

Switching **away** from a single-field-set type back to Trip does not clear
whatever was in the dropoff\_\* fields — they just become "Dropoff" again, and a
(now-visible) empty Pickup section is exposed. This matches how the type dropdown
already behaves for every other field today (nothing is cleared on type change).

## Bill of Lading PDF: `BillOfLadingDocument.tsx`

Currently always renders both a Pickup block and a Dropoff block
(`BillOfLadingDocument.tsx:326-369`). Add the same `isSingleFieldSetType` check
(passed down as a prop, or derived from `workTracker.work_tracker_type_uuid` +
a types lookup passed to the document) and:

- Omit the Pickup block entirely.
- Relabel the Dropoff block's field labels to the generic `Time` / `POC` /
  `Address` / `Instructions` form, matching the modal.

`BillOfLadingButton.tsx` / wherever `BillOfLadingDocument` is invoked will need
`workTrackerTypes` (or just the resolved type name) threaded through — needs a
quick check at implementation time of what's already available in that call
path.

## Permissions matrix

No permission/role changes — this is a UI/data-shape change, not an access-control
change. `permissionPageData.ts` is not affected. (Sanity-checking this claim is
part of implementation: if editing the now-QBO-only "types" modal turns out to key
off a different capability than before, update the matrix in the same commit per
CLAUDE.md.)

## Open questions (need your call before/at implementation)

1. **Teardown Required for single-field-set types** — hide it entirely (dropped),
   or keep it reachable next to Setup Required in the single visible column? A
   Repair/Maintenance job could plausibly still need teardown.
2. **Modal/button naming** — rename "Edit types" / `EditWorkTrackerTypesModal` to
   reflect its new QBO-only purpose, or leave the name as-is to minimize the diff?
3. **`Site Visit / Cleaning / Other` QBO accounts post-migration** — since this
   type is now a merge of 5 previously-separate types (some of which may have had
   different or no QBO accounts assigned per connection), someone needs to review
   and re-confirm its account assignment per connection after the migration runs.
   Who does that, and should the app surface a banner/warning until it's done, or
   is a Slack heads-up enough?

## Testing (per CLAUDE.md TDD)

- Unit: a small pure helper (e.g. `isSingleFieldSetWorkTrackerType(displayName)`
  or similar) gets a Vitest test, replacing/extending the deleted
  `classifyWorkTrackerTypes.test.ts` coverage.
- Component/e2e: Playwright coverage that (a) selecting Repair/Maintenance or Site
  Visit/Cleaning/Other hides the Pickup column and relabels Dropoff, (b) the
  "Edit types"/QBO modal no longer offers Add/Delete/Rename, (c) bill creation
  still resolves the right QBO account per type per connection (regression check
  on existing behavior, not new).
- Migration: a `db test`-style check (per `16c2c45 fix db test` in recent history)
  confirming no `WorkTrackers` row is left pointing at a soft-deleted type after
  migration.
