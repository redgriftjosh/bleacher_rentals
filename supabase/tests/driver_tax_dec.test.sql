-- ============================================================================
-- Tests for Drivers.tax_dec and the sync_driver_tax() trigger
-- Migration: 20260905120000_driver_tax_dec.sql
-- ============================================================================
-- Run against a local Supabase DB after migrations are applied:
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/driver_tax_dec.test.sql
--
-- Everything runs in a transaction that is ROLLED BACK at the end.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(10);

-- ── Shape of the column ─────────────────────────────────────────────────────

SELECT is(
  (SELECT data_type
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Drivers' AND column_name = 'tax_dec'),
  'numeric',
  'tax_dec is numeric'
);

SELECT is(
  (SELECT numeric_scale::int
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Drivers' AND column_name = 'tax_dec'),
  3,
  'tax_dec keeps 3 decimals'
);

SELECT is(
  (SELECT is_nullable
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Drivers' AND column_name = 'tax_dec'),
  'NO',
  'tax_dec is NOT NULL'
);

-- ── The trigger ─────────────────────────────────────────────────────────────
--
-- Plain top-level statements + psql's \gset, not a DO block: pgTAP's is()
-- returns the TAP output line as its result row, and PERFORM (the only way to
-- call a value-returning function inside plpgsql) throws that return value
-- away. A PERFORM is() runs the assertion but never emits it, so the plan
-- count silently drifts from what pg_prove actually sees.

INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
VALUES ('Tax', 'Quebec', 'tax_dec_qc@test.com', 'clerk_tax_dec_qc', false, false)
RETURNING id AS user_a \gset

INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
VALUES ('Tax', 'Legacy', 'tax_dec_legacy@test.com', 'clerk_tax_dec_legacy', false, false)
RETURNING id AS user_b \gset

-- Insert writing the decimal rate: the deprecated column follows, rounded.
INSERT INTO public."Drivers" (user_uuid, tax_dec, is_active)
VALUES (:'user_a', 14.975, true)
RETURNING id AS driver_a \gset

SELECT is(
  (SELECT tax_dec FROM public."Drivers" WHERE id = :'driver_a'),
  14.975::numeric,
  'insert keeps the full decimal rate'
);
SELECT is(
  (SELECT tax FROM public."Drivers" WHERE id = :'driver_a'),
  15::smallint,
  'insert rounds 14.975 into the deprecated tax column'
);

-- Update writing the decimal rate: half-down stays down.
UPDATE public."Drivers" SET tax_dec = 9.4 WHERE id = :'driver_a';

SELECT is(
  (SELECT tax_dec FROM public."Drivers" WHERE id = :'driver_a'),
  9.4::numeric,
  'update keeps the new decimal rate'
);
SELECT is(
  (SELECT tax FROM public."Drivers" WHERE id = :'driver_a'),
  9::smallint,
  'update rounds 9.4 down in the deprecated column'
);

-- A shipped driver app - or a hand-written SQL update - writes only `tax`.
-- tax_dec has to follow, or the deprecated column becomes the only truth.
INSERT INTO public."Drivers" (user_uuid, tax, is_active)
VALUES (:'user_b', 13, true)
RETURNING id AS driver_b \gset

SELECT is(
  (SELECT tax_dec FROM public."Drivers" WHERE id = :'driver_b'),
  13::numeric,
  'a legacy insert of tax back-fills tax_dec'
);

UPDATE public."Drivers" SET tax = 7 WHERE id = :'driver_b';

SELECT is(
  (SELECT tax_dec FROM public."Drivers" WHERE id = :'driver_b'),
  7::numeric,
  'a legacy update of tax back-fills tax_dec'
);

-- An unrelated edit must not disturb either column.
UPDATE public."Drivers" SET pay_rate_cents = 123 WHERE id = :'driver_a';

SELECT is(
  (SELECT tax_dec FROM public."Drivers" WHERE id = :'driver_a'),
  9.4::numeric,
  'an unrelated update leaves the rate alone'
);

SELECT * FROM finish();
ROLLBACK;
