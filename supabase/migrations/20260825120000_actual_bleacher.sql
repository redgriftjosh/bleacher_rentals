-- ============================================================================
-- Record which bleacher the driver ACTUALLY took.
--
-- Managers assign a specific bleacher to a work tracker, but at the warehouse
-- the assigned unit is often buried behind others. Drivers take an equivalent
-- one from the front instead. Until now the app had no way to say so, which
-- meant inspections and damage reports were filed against the wrong physical
-- trailer.
--
-- SCOPE, DELIBERATELY NARROW: only the work tracker, its inspections and the
-- damage reports learn about the swap. Events, bleacher availability and
-- assignment conflict checks keep seeing the manager-assigned bleacher, and
-- the Bill of Lading keeps printing it. That drift is a known, accepted
-- trade-off — reconciling it is the manager's job, prompted by the swap
-- notification. Do not "fix" it here without revisiting that decision.
-- ============================================================================

alter table public."WorkTrackers"
  add column if not exists actual_bleacher_uuid uuid references public."Bleachers"("id"),
  add column if not exists bleacher_change_reason text;

comment on column public."WorkTrackers".actual_bleacher_uuid is
  'Bleacher the driver confirmed taking, written when an inspection is submitted. '
  'NULL means the driver has not confirmed yet — it is NOT a shorthand for "same as '
  'bleacher_uuid", which is written explicitly so the two states stay distinguishable. '
  'A manager may overwrite this from the web.';

comment on column public."WorkTrackers".bleacher_change_reason is
  'Why the driver took a different bleacher. Preset code, never free text — drivers '
  'will not type. NULL when no swap happened.';

-- Value domain only. The tempting cross-column rule ("reason must be null unless
-- actual_bleacher_uuid is distinct from bleacher_uuid") is deliberately NOT added:
-- a manager correcting actual_bleacher_uuid back to the assigned one would trip it,
-- and a rejected write from the mobile app does not just fail — it wedges the
-- PowerSync upload queue and blocks every write behind it.
alter table public."WorkTrackers"
  drop constraint if exists "WorkTrackers_bleacher_change_reason_check";

alter table public."WorkTrackers"
  add constraint "WorkTrackers_bleacher_change_reason_check"
  check (
    bleacher_change_reason is null
    or bleacher_change_reason in (
      'hard_to_access',
      'blocked_by_other_units',
      'damaged',
      'not_on_site',
      'other'
    )
  );

-- The inspection records the bleacher it actually covered, at the time it was
-- taken. Inspection rows are immutable, so this survives a later manager
-- correction of WorkTrackers.actual_bleacher_uuid — which is the whole point:
-- the damage report attached to this inspection must stay attributable to the
-- trailer that was really standing in front of the driver.
--
-- Nullable because every pre-existing inspection has no answer to this.
alter table public."WorkTrackerInspections"
  add column if not exists bleacher_uuid uuid references public."Bleachers"("id");

comment on column public."WorkTrackerInspections".bleacher_uuid is
  'Bleacher this inspection actually covered. NULL on rows created before the '
  'driver could confirm a swap — fall back to the work tracker for those.';
