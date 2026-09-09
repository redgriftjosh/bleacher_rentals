-- ============================================================================
-- Tests for WorkTrackerTypes.code and the fixed-3-types migration
-- Migration: 20260908202341_work_tracker_type_codes.sql
-- ============================================================================
-- Run against a local Supabase DB after migrations are applied:
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/work_tracker_type_codes.test.sql
--
-- Everything runs in a transaction that is ROLLED BACK at the end.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(12);

-- ── Shape of the column ─────────────────────────────────────────────────────

SELECT is(
  (SELECT data_type
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkTrackerTypes' AND column_name = 'code'),
  'USER-DEFINED',
  'code is a Postgres enum column'
);

SELECT is(
  (SELECT udt_name
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkTrackerTypes' AND column_name = 'code'),
  'work_tracker_type_code',
  'code uses the work_tracker_type_code enum'
);

SELECT is(
  (SELECT is_nullable
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkTrackerTypes' AND column_name = 'code'),
  'YES',
  'code is nullable (only the 3 canonical rows ever have one)'
);

SELECT is(
  (SELECT enum_range(NULL::work_tracker_type_code)::text[]),
  ARRAY['trip', 'repair_maintenance', 'site_visit_cleaning_other'],
  'the enum has exactly the 3 canonical codes, in that order'
);

-- ── Uniqueness ───────────────────────────────────────────────────────────────
--
-- The real 'trip' row already exists from the migration, so inserting a
-- second row with the same code should fail immediately.

SELECT throws_ok(
  $$ INSERT INTO public."WorkTrackerTypes" (display_name, code) VALUES ('Duplicate Trip', 'trip') $$,
  '23505',
  NULL,
  'a second row cannot reuse an already-assigned code'
);

-- ── Each canonical code maps to exactly one active row ──────────────────────

SELECT is(
  (SELECT count(*) FROM public."WorkTrackerTypes" WHERE code = 'trip' AND is_deleted = false),
  1::bigint,
  'exactly one active row has code = trip'
);

SELECT is(
  (SELECT count(*)
     FROM public."WorkTrackerTypes"
    WHERE code = 'repair_maintenance' AND is_deleted = false),
  1::bigint,
  'exactly one active row has code = repair_maintenance'
);

SELECT is(
  (SELECT count(*)
     FROM public."WorkTrackerTypes"
    WHERE code = 'site_visit_cleaning_other' AND is_deleted = false),
  1::bigint,
  'exactly one active row has code = site_visit_cleaning_other'
);

SELECT is(
  (SELECT display_name FROM public."WorkTrackerTypes" WHERE code = 'repair_maintenance'),
  'Repair / Maintenance',
  'the repair_maintenance row was renamed to its final label'
);

SELECT is(
  (SELECT display_name FROM public."WorkTrackerTypes" WHERE code = 'site_visit_cleaning_other'),
  'Site Visit / Cleaning / Other',
  'the site_visit_cleaning_other row was renamed to its final label'
);

-- ── Legacy types were soft-deleted, not left dangling ───────────────────────

SELECT is(
  (SELECT count(*)
     FROM public."WorkTrackerTypes"
    WHERE display_name IN ('Site Visit', 'Set up', 'Hotel/ Per Diem', 'Tear down', 'Deadhead')
      AND (is_deleted = false OR code IS NOT NULL)),
  0::bigint,
  'every legacy type name is soft-deleted and has no code'
);

-- ── The invariant this whole migration exists for ───────────────────────────

SELECT is(
  (SELECT count(*)
     FROM public."WorkTrackers" wt
     JOIN public."WorkTrackerTypes" t ON t.id = wt.work_tracker_type_uuid
    WHERE t.is_deleted = true),
  0::bigint,
  'no work tracker points at a soft-deleted type'
);

SELECT * FROM finish();
ROLLBACK;
