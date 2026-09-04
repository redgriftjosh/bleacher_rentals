-- ============================================================================
-- Tests for WorkTrackerLineItems.qty_decimal and the
-- sync_work_tracker_line_item_qty() trigger
-- Migration: 20260906120000_work_tracker_line_item_qty_decimal.sql
-- ============================================================================
-- Run against a local Supabase DB after migrations are applied:
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/work_tracker_line_item_qty_decimal.test.sql
--
-- Everything runs in a transaction that is ROLLED BACK at the end.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(13);

-- ── Shape of the column ─────────────────────────────────────────────────────

SELECT is(
  (SELECT data_type
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkTrackerLineItems'
      AND column_name = 'qty_decimal'),
  'numeric',
  'qty_decimal is numeric'
);

SELECT is(
  (SELECT numeric_scale::int
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkTrackerLineItems'
      AND column_name = 'qty_decimal'),
  1,
  'qty_decimal keeps 1 decimal'
);

SELECT is(
  (SELECT is_nullable
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'WorkTrackerLineItems'
      AND column_name = 'qty_decimal'),
  'NO',
  'qty_decimal is NOT NULL'
);

-- ── The trigger ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  tracker_a UUID;
  item_a    UUID;
  item_b    UUID;
  v_qty     INTEGER;
  v_qty_dec NUMERIC;
BEGIN
  INSERT INTO public."WorkTrackers" DEFAULT VALUES RETURNING id INTO tracker_a;

  -- Insert writing the decimal quantity: the deprecated column follows, rounded.
  INSERT INTO public."WorkTrackerLineItems" (work_tracker_uuid, type, qty_decimal, unit_amt_cents)
  VALUES (tracker_a, 'maintenance', 2.5, 1999)
  RETURNING id INTO item_a;

  SELECT quantity, qty_decimal INTO v_qty, v_qty_dec
    FROM public."WorkTrackerLineItems" WHERE id = item_a;
  PERFORM is(v_qty_dec, 2.5::numeric, 'insert keeps the full decimal quantity');
  PERFORM is(v_qty, 3, 'insert rounds 2.5 up into the deprecated quantity column');

  -- Update writing the decimal quantity: half-down stays down.
  UPDATE public."WorkTrackerLineItems" SET qty_decimal = 9.4 WHERE id = item_a;
  SELECT quantity, qty_decimal INTO v_qty, v_qty_dec
    FROM public."WorkTrackerLineItems" WHERE id = item_a;
  PERFORM is(v_qty_dec, 9.4::numeric, 'update keeps the new decimal quantity');
  PERFORM is(v_qty, 9, 'update rounds 9.4 down in the deprecated column');

  -- A shipped driver app - or a hand-written SQL update - writes only `quantity`.
  -- qty_decimal has to follow, or the deprecated column becomes the only truth.
  INSERT INTO public."WorkTrackerLineItems" (work_tracker_uuid, type, quantity, unit_amt_cents)
  VALUES (tracker_a, 'hauling', 4, 500)
  RETURNING id INTO item_b;

  SELECT qty_decimal INTO v_qty_dec
    FROM public."WorkTrackerLineItems" WHERE id = item_b;
  PERFORM is(v_qty_dec, 4::numeric, 'a legacy insert of quantity back-fills qty_decimal');

  UPDATE public."WorkTrackerLineItems" SET quantity = 7 WHERE id = item_b;
  SELECT qty_decimal INTO v_qty_dec
    FROM public."WorkTrackerLineItems" WHERE id = item_b;
  PERFORM is(v_qty_dec, 7::numeric, 'a legacy update of quantity back-fills qty_decimal');

  -- A row that names neither column still gets a consistent pair from the defaults.
  PERFORM is(
    (SELECT quantity FROM public."WorkTrackerLineItems" WHERE id = item_a) IS NOT NULL,
    true,
    'quantity is never left null'
  );

  -- An unrelated edit must not disturb either column.
  UPDATE public."WorkTrackerLineItems" SET description = 'note' WHERE id = item_a;
  SELECT quantity, qty_decimal INTO v_qty, v_qty_dec
    FROM public."WorkTrackerLineItems" WHERE id = item_a;
  PERFORM is(v_qty_dec, 9.4::numeric, 'an unrelated update leaves the decimal quantity alone');
  PERFORM is(v_qty, 9, 'an unrelated update leaves the deprecated column alone');
END $$;

-- ── The non-negative check ──────────────────────────────────────────────────

SELECT throws_ok(
  $$
    WITH t AS (
      INSERT INTO public."WorkTrackers" DEFAULT VALUES RETURNING id
    )
    INSERT INTO public."WorkTrackerLineItems" (work_tracker_uuid, type, qty_decimal)
    SELECT id, 'custom', -1 FROM t
  $$,
  '23514',
  NULL,
  'a negative qty_decimal is rejected by the check constraint'
);

SELECT * FROM finish();
ROLLBACK;
