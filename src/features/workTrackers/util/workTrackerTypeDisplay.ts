import type { WorkTrackerTypeOption } from "../hooks/useWorkTrackerTypes";

/** The stable identifier for each of the 3 canonical work tracker types. */
export type WorkTrackerTypeCode = "trip" | "repair_maintenance" | "site_visit_cleaning_other";

/**
 * The exact 3 work tracker types the product should ever offer, in the exact
 * order they should appear, keyed by their stable `code` (a real Postgres enum
 * column — see supabase/migrations/20260908202341_work_tracker_type_codes.sql)
 * rather than the freely-editable `display_name` text column. Any other row
 * (legacy types merged away by that migration, or anything with `code` still
 * null) is invisible here regardless of what order the DB returns it in.
 * See docs/specs/work-tracker-fixed-types.md.
 */
const CANONICAL_TYPE_CODES: WorkTrackerTypeCode[] = [
  "trip",
  "repair_maintenance",
  "site_visit_cleaning_other",
];

/**
 * Builds the Type dropdown's option list: always exactly the 3 canonical types
 * above, in that fixed order — never more, never fewer, and never reordered by
 * whatever the DB's `sort_order` happens to be. A canonical code missing from
 * `types` (shouldn't happen; the migration backfills all 3) is silently
 * skipped rather than shown as broken.
 *
 * If `selectedTypeId` points at a type with no code (an existing work tracker
 * saved under a legacy type before the migration ran, or before it merges into
 * one of the 3), that type is appended at the end so the dropdown doesn't
 * silently show a blank/invalid selection for it.
 */
export function getSelectableWorkTrackerTypes(
  types: WorkTrackerTypeOption[],
  selectedTypeId?: string | null,
): WorkTrackerTypeOption[] {
  const result: WorkTrackerTypeOption[] = [];

  for (const code of CANONICAL_TYPE_CODES) {
    const match = types.find((t) => t.code === code);
    if (match) result.push(match);
  }

  const selected = types.find((t) => t.id === selectedTypeId);
  const selectedIsCanonical = selected && result.some((t) => t.id === selected.id);
  if (selected && !selectedIsCanonical) result.push(selected);

  return result;
}

/**
 * Whether a work tracker of this type uses the single-field-set layout
 * (Repair/Maintenance, Site Visit/Cleaning/Other) instead of Trip's separate
 * Pickup/Dropoff sections. `code == null` (a legacy type, or the type row
 * hasn't loaded yet) defaults to `false` — the full Trip-style layout — same
 * as an unrecognized/unset type would today.
 *
 * Shared by WorkTrackerModal (the live form) and BillOfLadingButton (the PDF)
 * so the two never drift on what counts as "single field set".
 */
export function isSingleFieldSetType(code: string | null | undefined): boolean {
  return Boolean(code && code !== "trip");
}
