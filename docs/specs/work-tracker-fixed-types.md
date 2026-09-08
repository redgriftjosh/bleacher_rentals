# Work Tracker Fixed Types

## Status

Core feature shipped (see commits `f6a2e11`, `af26384`, `1f9df92` on
`worktracker-types`). Remaining work is listed at the bottom.

## What this is

Work tracker "types" used to be a free-form list anyone could add/rename/delete
from a modal. There are now exactly **3**, each with its own field layout:

1. **Trip** (default) — separate Pickup and Dropoff sections, each with Time,
   POC, Address, Instructions, plus Teardown Required (pickup side) and Setup
   Required (dropoff side).
2. **Repair / Maintenance** — a single field set (Time, POC, Address,
   Instructions), physically stored in the existing `dropoff_*` columns.
3. **Site Visit / Cleaning / Other** — same single-field-set layout as above,
   with its own QuickBooks account per connection.

## Architecture

Each type row is matched by a stable `code` column
(`work_tracker_type_code` — a real Postgres enum: `trip` |
`repair_maintenance` | `site_visit_cleaning_other`), not by the freely-editable
`display_name` text. `display_name` is presentation only and can be renamed
without touching any app logic. `WorkTrackerTypeQboAccounts` — the
per-connection QBO account mapping — already existed before this feature and
is unchanged; it's what `/api/quickbooks/create-bill` reads to resolve an
account per type per connection at bill time.

## What shipped

- **Migration** (`supabase/migrations/20260908202341_work_tracker_type_codes.sql`):
  adds the `code` enum + column, assigns codes to production's 3 canonical
  rows (renaming 2 to their final names), merges every work tracker on a
  legacy type (Site Visit, Set up, Hotel/ Per Diem, Tear down, Deadhead) into
  Site Visit/Cleaning/Other, and soft-deletes those 5 legacy rows.
  `supabase/seed.sql` was hand-aligned to the same end state, since migrations
  run before seed data loads locally.
- **`WorkTrackerModal.tsx`**: a `WorkTrackerTypeSelect` dropdown (icon +
  color-coded per type) sits next to the Details/Line Items tabs. Picking a
  type toggles `isSingleFieldSetType` (`code !== "trip"`), which hides the
  Pickup column and the route map, and relabels the Dropoff column's fields
  to the generic `Time` / `POC` / `Address` / `Instructions`.
- **`/work-tracker-types`** page (Configuration section, admin-only) replaces
  the old `EditWorkTrackerTypesModal` — same per-connection QBO account
  picker, but no add/rename/delete/reorder. `WorkTrackerModal`'s "Edit types"
  link is admin-gated and confirms losing unsaved changes before navigating
  there. Registered in `accessConfig.ts`, `useSidebarItems.ts`, and
  `permissionPageData.ts`.

## Remaining work

1. **Bill of Lading PDF** (`BillOfLadingDocument.tsx`) still always prints a
   Pickup block. For single-field-set types it'll show blank/dashes rather
   than being omitted, and the Dropoff labels aren't relabeled like the modal.
2. **Test coverage** — `workTrackerTypeDisplay.test.ts` covers the type-filter
   logic. Nothing yet covers the field-layout switch, the admin page, or bill
   creation resolving the right account per type in an e2e/integration sense.
3. **Push the migration to production** — it's only been applied locally via
   `supabase db reset` so far.
