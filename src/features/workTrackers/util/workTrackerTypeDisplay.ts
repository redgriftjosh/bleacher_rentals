import type { WorkTrackerTypeOption } from "../hooks/useWorkTrackerTypes";

/**
 * The exact 3 work tracker types the product should ever offer, in the exact
 * order they should appear, with their final display labels — hardcoded rather
 * than derived from the DB's row order or count. Production data still has extra
 * legacy types (e.g. "Site Visit", "Set up", "Deadhead") that a migration will
 * eventually merge away — see docs/specs/work-tracker-fixed-types.md — but until
 * that migration runs, the dropdown is pinned to this list regardless of what
 * else exists in `WorkTrackerTypes` or what order it comes back in.
 *
 * `dbName` is the *current* `WorkTrackerTypes.display_name` — used only to look up
 * that row's real id (a hard FK on `WorkTrackers.work_tracker_type_uuid`, so the
 * saved value always has to be a real row). `label` is the final name from the
 * spec, shown ahead of the rename migration.
 */
const CANONICAL_TYPES = [
  { dbName: "Trip", label: "Trip" },
  { dbName: "Repair/Maintenance", label: "Repair / Maintenance" },
  { dbName: "Cleaning", label: "Site Visit / Cleaning / Other" },
] as const;

/**
 * Builds the Type dropdown's option list: always exactly the 3 canonical types
 * above, in that fixed order, each relabeled to its final name — never more,
 * never fewer, and never reordered by whatever the DB's `sort_order` happens to
 * be. A canonical type missing from `types` (shouldn't happen; it's seeded) is
 * silently skipped rather than shown as broken.
 *
 * If `selectedTypeId` points at a type outside the canonical 3 (an existing work
 * tracker saved under a legacy type before the migration ran), that type is
 * appended at the end — as its raw display_name, unrelabeled — so the dropdown
 * doesn't silently show a blank/invalid selection for it.
 */
export function getSelectableWorkTrackerTypes(
  types: WorkTrackerTypeOption[],
  selectedTypeId?: string | null,
): WorkTrackerTypeOption[] {
  const result: WorkTrackerTypeOption[] = [];

  for (const canonical of CANONICAL_TYPES) {
    const match = types.find((t) => t.display_name === canonical.dbName);
    if (match) result.push({ ...match, display_name: canonical.label });
  }

  const selected = types.find((t) => t.id === selectedTypeId);
  const selectedIsCanonical = selected && result.some((t) => t.id === selected.id);
  if (selected && !selectedIsCanonical) result.push(selected);

  return result;
}
