-- ============================================================================
-- Tests for DriverPayRanges RLS (admins + account managers get full CRUD)
-- ============================================================================
-- Run against a local Supabase DB after migrations are applied:
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/driver_pay_ranges_rls.test.sql
--
-- Everything runs in a transaction that is ROLLED BACK at the end.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  user_admin   UUID;
  user_am      UUID;
  user_viewer  UUID;
  user_driver  UUID;

  clerk_admin  TEXT := 'clerk_dpr_admin';
  clerk_am     TEXT := 'clerk_dpr_am';
  clerk_viewer TEXT := 'clerk_dpr_viewer';
  clerk_driver TEXT := 'clerk_dpr_driver';

  am_id        UUID;
  driver_id    UUID;
  range_id     UUID;
  v_count      INTEGER;
  v_rate       NUMERIC;
BEGIN
  RAISE NOTICE '--- DriverPayRanges RLS tests ---';

  -- ==========================================================================
  -- SETUP
  -- ==========================================================================
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('DPR', 'Admin', 'dpr_admin@test.com', clerk_admin, true, false)
  RETURNING id INTO user_admin;

  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('DPR', 'AM', 'dpr_am@test.com', clerk_am, false, false)
  RETURNING id INTO user_am;

  INSERT INTO public."AccountManagers" (user_uuid, is_active)
  VALUES (user_am, true)
  RETURNING id INTO am_id;

  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('DPR', 'Viewer', 'dpr_viewer@test.com', clerk_viewer, false, true)
  RETURNING id INTO user_viewer;

  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('DPR', 'Driver', 'dpr_driver@test.com', clerk_driver, false, false)
  RETURNING id INTO user_driver;

  INSERT INTO public."Drivers" (user_uuid, is_active, account_manager_uuid)
  VALUES (user_driver, true, am_id)
  RETURNING id INTO driver_id;

  -- ==========================================================================
  -- PART A: constraints
  -- ==========================================================================

  -- TEST A1: max_value must be greater than min_value
  BEGIN
    INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
    VALUES (driver_id, 100, 50, 1.25);
    ASSERT false, 'A1 inverted range should have failed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST A1 (max_value <= min_value rejected) ✓';
  END;

  -- TEST A2: negative rate rejected
  BEGIN
    INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
    VALUES (driver_id, 0, 50, -1);
    ASSERT false, 'A2 negative rate should have failed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST A2 (negative rate rejected) ✓';
  END;

  -- TEST A3: open ended top tier (null max_value) allowed
  INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
  VALUES (driver_id, 500, NULL, 2.50);
  RAISE NOTICE 'TEST A3 (null max_value allowed) ✓';

  -- TEST A4: ranges are removed with their driver
  DECLARE
    tmp_user   UUID;
    tmp_driver UUID;
  BEGIN
    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
    VALUES ('DPR', 'Temp', 'dpr_temp@test.com', 'clerk_dpr_temp', false, false)
    RETURNING id INTO tmp_user;

    INSERT INTO public."Drivers" (user_uuid, is_active, account_manager_uuid)
    VALUES (tmp_user, true, am_id)
    RETURNING id INTO tmp_driver;

    INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
    VALUES (tmp_driver, 0, 100, 1.00);

    DELETE FROM public."Drivers" WHERE id = tmp_driver;

    SELECT count(*) INTO v_count FROM public."DriverPayRanges" WHERE driver_uuid = tmp_driver;
    ASSERT v_count = 0,
      format('A4 cascade delete: expected 0 rows, got %s', v_count);
    RAISE NOTICE 'TEST A4 (driver delete cascades to pay ranges) ✓';
  END;

  -- ==========================================================================
  -- PART B: RLS (run as authenticated so policies apply)
  -- ==========================================================================
  SET LOCAL ROLE authenticated;

  -- TEST B1: Admin full CRUD
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

  INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
  VALUES (driver_id, 0, 100, 1.00)
  RETURNING id INTO range_id;

  SELECT count(*) INTO v_count FROM public."DriverPayRanges" WHERE id = range_id;
  ASSERT v_count = 1, format('B1 admin select: expected 1, got %s', v_count);

  UPDATE public."DriverPayRanges" SET rate = 1.75 WHERE id = range_id;
  SELECT rate INTO v_rate FROM public."DriverPayRanges" WHERE id = range_id;
  ASSERT v_rate = 1.75, format('B1 admin update: expected 1.75, got %s', v_rate);

  DELETE FROM public."DriverPayRanges" WHERE id = range_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, format('B1 admin delete: expected 1 deleted, got %s', v_count);
  RAISE NOTICE 'TEST B1 (admin → full CRUD) ✓';

  -- TEST B2: Account manager full CRUD
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

  INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
  VALUES (driver_id, 100, 200, 1.50)
  RETURNING id INTO range_id;

  SELECT count(*) INTO v_count FROM public."DriverPayRanges" WHERE id = range_id;
  ASSERT v_count = 1, format('B2 AM select: expected 1, got %s', v_count);

  UPDATE public."DriverPayRanges" SET rate = 2.25 WHERE id = range_id;
  SELECT rate INTO v_rate FROM public."DriverPayRanges" WHERE id = range_id;
  ASSERT v_rate = 2.25, format('B2 AM update: expected 2.25, got %s', v_rate);

  DELETE FROM public."DriverPayRanges" WHERE id = range_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, format('B2 AM delete: expected 1 deleted, got %s', v_count);
  RAISE NOTICE 'TEST B2 (account_manager → full CRUD) ✓';

  -- Seed a row (as admin) that the blocked roles will try to reach
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
  VALUES (driver_id, 200, 300, 3.00)
  RETURNING id INTO range_id;

  -- TEST B3: Viewer cannot read or write
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);

  SELECT count(*) INTO v_count FROM public."DriverPayRanges";
  ASSERT v_count = 0, format('B3 viewer select: expected 0, got %s', v_count);

  BEGIN
    INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
    VALUES (driver_id, 300, 400, 4.00);
    ASSERT false, 'B3 viewer insert should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  UPDATE public."DriverPayRanges" SET rate = 9.99 WHERE id = range_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, format('B3 viewer update: expected 0 updated, got %s', v_count);

  DELETE FROM public."DriverPayRanges" WHERE id = range_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, format('B3 viewer delete: expected 0 deleted, got %s', v_count);
  RAISE NOTICE 'TEST B3 (viewer → no access) ✓';

  -- TEST B4: Driver (no admin/AM role) cannot read or write
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_driver)::text, true);

  SELECT count(*) INTO v_count FROM public."DriverPayRanges";
  ASSERT v_count = 0, format('B4 driver select: expected 0, got %s', v_count);

  BEGIN
    INSERT INTO public."DriverPayRanges" (driver_uuid, min_value, max_value, rate)
    VALUES (driver_id, 400, 500, 5.00);
    ASSERT false, 'B4 driver insert should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  UPDATE public."DriverPayRanges" SET rate = 9.99 WHERE id = range_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, format('B4 driver update: expected 0 updated, got %s', v_count);

  DELETE FROM public."DriverPayRanges" WHERE id = range_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, format('B4 driver delete: expected 0 deleted, got %s', v_count);
  RAISE NOTICE 'TEST B4 (driver → no access) ✓';

  RESET ROLE;

  RAISE NOTICE '--- all DriverPayRanges RLS tests passed ---';
END;
$$;

SELECT ok(true, 'all assertions passed');
SELECT * FROM finish();

ROLLBACK;
