-- ============================================================================
-- Tests for WorkTrackers.pickup_at/dropoff_at and sync_work_tracker_time_text()
-- Migration: 20260908220358_work_tracker_pickup_dropoff_at.sql
-- ============================================================================
-- Run against a local Supabase DB after migrations are applied:
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/work_tracker_pickup_dropoff_at.test.sql
--
-- Everything runs in a transaction that is ROLLED BACK at the end.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(8);

-- ── Shape of the columns ────────────────────────────────────────────────────

SELECT is(
  (SELECT data_type
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkTrackers' AND column_name = 'pickup_at'),
  'timestamp with time zone',
  'pickup_at is a real timestamptz'
);

SELECT is(
  (SELECT data_type
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkTrackers' AND column_name = 'dropoff_at'),
  'timestamp with time zone',
  'dropoff_at is a real timestamptz'
);

-- ── The trigger formats a readable mirror, DST-aware ────────────────────────

INSERT INTO public."WorkTrackers" (pickup_at, pickup_timezone, dropoff_at, dropoff_timezone)
VALUES ('2026-07-15T14:00:00Z', 'America/Toronto', '2026-01-15T14:00:00Z', 'America/Toronto')
RETURNING id AS wt_a \gset

SELECT is(
  (SELECT pickup_time FROM public."WorkTrackers" WHERE id = :'wt_a'),
  '10:00 AM (EDT)',
  'pickup_time mirrors pickup_at in daylight time'
);

SELECT is(
  (SELECT dropoff_time FROM public."WorkTrackers" WHERE id = :'wt_a'),
  '09:00 AM (EST)',
  'dropoff_time mirrors dropoff_at in standard time'
);

-- ── A different zone renders differently for the same instant ──────────────

INSERT INTO public."WorkTrackers" (pickup_at, pickup_timezone)
VALUES ('2026-07-15T14:00:00Z', 'America/Vancouver')
RETURNING id AS wt_b \gset

SELECT is(
  (SELECT pickup_time FROM public."WorkTrackers" WHERE id = :'wt_b'),
  '07:00 AM (PDT)',
  'the same instant renders differently in a different zone'
);

-- ── Historical free-text rows are left alone ────────────────────────────────

INSERT INTO public."WorkTrackers" (pickup_time, dropoff_time)
VALUES ('anytime', '-')
RETURNING id AS wt_c \gset

SELECT is(
  (SELECT pickup_time FROM public."WorkTrackers" WHERE id = :'wt_c'),
  'anytime',
  'a row with no pickup_at keeps its historical free-text pickup_time'
);

-- An unrelated update on that same row must not touch the free text either —
-- this is the exact failure mode a naive "always overwrite" trigger would hit.
UPDATE public."WorkTrackers" SET notes = 'unrelated update' WHERE id = :'wt_c';

SELECT is(
  (SELECT pickup_time FROM public."WorkTrackers" WHERE id = :'wt_c'),
  'anytime',
  'an unrelated update does not blank out historical free-text pickup_time'
);

-- ── Setting pickup_at later starts the mirror, without disturbing dropoff ──

UPDATE public."WorkTrackers"
   SET pickup_at = '2026-07-15T14:00:00Z', pickup_timezone = 'America/Toronto'
 WHERE id = :'wt_c';

SELECT is(
  (SELECT pickup_time || ' / ' || dropoff_time FROM public."WorkTrackers" WHERE id = :'wt_c'),
  '10:00 AM (EDT) / -',
  'pickup_time starts following once pickup_at is set, dropoff_time (still unset) is untouched'
);

SELECT * FROM finish();
ROLLBACK;
