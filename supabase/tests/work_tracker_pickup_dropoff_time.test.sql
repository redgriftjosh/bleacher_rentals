-- ============================================================================
-- Tests for WorkTrackers pickup/dropoff time_mode/start/end and
-- sync_work_tracker_time_text()
-- Migration: 20260908220358_work_tracker_pickup_dropoff_at.sql
-- ============================================================================
-- Run against a local Supabase DB after migrations are applied:
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/work_tracker_pickup_dropoff_time.test.sql
--
-- Everything runs in a transaction that is ROLLED BACK at the end.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(9);

-- ── Shape of the columns ────────────────────────────────────────────────────

SELECT is(
  (SELECT column_default
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkTrackers' AND column_name = 'pickup_time_mode'),
  '''any_time''::work_tracker_time_mode',
  'pickup_time_mode defaults to any_time'
);

SELECT is(
  (SELECT data_type
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'WorkTrackers' AND column_name = 'pickup_time_start'),
  'time without time zone',
  'pickup_time_start is a plain time column'
);

-- ── Range check constraint ───────────────────────────────────────────────────

SELECT throws_ok(
  $$ INSERT INTO public."WorkTrackers" (pickup_time_mode, pickup_time_start, pickup_time_end)
     VALUES ('flexible', '09:00', '08:00') $$,
  '23514',
  NULL,
  'pickup_time_end before pickup_time_start is rejected'
);

-- ── The trigger formats a readable mirror ───────────────────────────────────

INSERT INTO public."WorkTrackers"
  (pickup_time_mode, pickup_time_start, pickup_time_end, dropoff_time_mode, dropoff_time_start, dropoff_time_end)
VALUES
  ('exact', '10:00', '10:00', 'flexible', '10:00', '12:00')
RETURNING id AS wt_a \gset

SELECT is(
  (SELECT pickup_time FROM public."WorkTrackers" WHERE id = :'wt_a'),
  '10:00 AM',
  'exact mode renders a single time'
);

SELECT is(
  (SELECT dropoff_time FROM public."WorkTrackers" WHERE id = :'wt_a'),
  '10:00 AM - 12:00 PM',
  'flexible mode renders a range'
);

-- ── any_time writes the literal "Any Time", including the default on a brand-new row ──

INSERT INTO public."WorkTrackers" DEFAULT VALUES
RETURNING id AS wt_b \gset

SELECT is(
  (SELECT pickup_time || ' / ' || dropoff_time FROM public."WorkTrackers" WHERE id = :'wt_b'),
  'Any Time / Any Time',
  'a brand-new row (mode defaults to any_time) gets "Any Time" on both sides'
);

-- ── A pre-existing free-text row is normalized to "Any Time" the next time it's
-- saved for any reason — never migrated off the any_time default, so any save
-- (even one unrelated to time) now overwrites the legacy text. ─────────────────

INSERT INTO public."WorkTrackers" (pickup_time, dropoff_time)
VALUES ('anytime', '-')
RETURNING id AS wt_c \gset

UPDATE public."WorkTrackers" SET notes = 'unrelated update' WHERE id = :'wt_c';

SELECT is(
  (SELECT pickup_time || ' / ' || dropoff_time FROM public."WorkTrackers" WHERE id = :'wt_c'),
  'Any Time / Any Time',
  'an unrelated update normalizes legacy free text to "Any Time" once the row is untouched-mode'
);

-- ── Setting an exact pickup later starts the mirror, dropoff stays Any Time ────

UPDATE public."WorkTrackers"
   SET pickup_time_mode = 'exact', pickup_time_start = '10:00', pickup_time_end = '10:00'
 WHERE id = :'wt_c';

SELECT is(
  (SELECT pickup_time || ' / ' || dropoff_time FROM public."WorkTrackers" WHERE id = :'wt_c'),
  '10:00 AM / Any Time',
  'pickup_time follows once set to exact, dropoff_time stays Any Time'
);

SELECT is(
  (SELECT pickup_time_mode FROM public."WorkTrackers" WHERE id = :'wt_a')::text,
  'exact',
  'pickup_time_mode round-trips as the enum value'
);

SELECT * FROM finish();
ROLLBACK;
