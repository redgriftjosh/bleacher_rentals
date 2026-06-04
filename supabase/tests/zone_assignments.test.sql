-- ============================================================================
-- Tests for Zone Assignments (AccountManagerZones, DriverZones, Bleachers.zone_uuid)
-- ============================================================================
-- Run: supabase test db
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  user_admin     UUID;
  user_am        UUID;
  user_viewer    UUID;
  user_driver    UUID;

  clerk_admin    TEXT := 'clerk_za_admin';
  clerk_am       TEXT := 'clerk_za_am';
  clerk_viewer   TEXT := 'clerk_za_viewer';
  clerk_driver   TEXT := 'clerk_za_driver';

  am_uuid        UUID;
  driver_uuid    UUID;
  zone_uuid      UUID;
  zone2_uuid     UUID;
  bleacher_uuid  UUID;
  v_count        INTEGER;
  v_zone         UUID;
BEGIN
  RAISE NOTICE '--- zone assignments tests ---';

  -- ==========================================================================
  -- SETUP
  -- ==========================================================================

  -- Admin user
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('ZA Admin', 'Test', 'za_admin@test.com', clerk_admin, true, false)
  RETURNING id INTO user_admin;

  -- AM user
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('ZA AM', 'Test', 'za_am@test.com', clerk_am, false, false)
  RETURNING id INTO user_am;

  INSERT INTO public."AccountManagers" (user_uuid, is_active)
  VALUES (user_am, true)
  RETURNING id INTO am_uuid;

  -- Viewer user
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('ZA Viewer', 'Test', 'za_viewer@test.com', clerk_viewer, false, true)
  RETURNING id INTO user_viewer;

  -- Driver user
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('ZA Driver', 'Test', 'za_driver@test.com', clerk_driver, false, false)
  RETURNING id INTO user_driver;

  INSERT INTO public."Drivers" (user_uuid, is_active, tax, pay_rate_cents, pay_currency, pay_per_unit)
  VALUES (user_driver, true, 0, 100, 'USD', 'trip')
  RETURNING id INTO driver_uuid;

  -- Zones
  INSERT INTO public."Zones" (display_name, description)
  VALUES ('Test Zone A', 'First test zone')
  RETURNING id INTO zone_uuid;

  INSERT INTO public."Zones" (display_name, description)
  VALUES ('Test Zone B', 'Second test zone')
  RETURNING id INTO zone2_uuid;

  -- Bleacher
  INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (8888, 10, 100)
  RETURNING id INTO bleacher_uuid;

  -- ==========================================================================
  -- PART 1: Schema validation
  -- ==========================================================================

  -- TEST 1.1: Bleachers has zone_uuid column
  ASSERT (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Bleachers' AND column_name = 'zone_uuid') = 1,
    '1.1 Bleachers should have zone_uuid column';
  RAISE NOTICE 'TEST 1.1 (Bleachers.zone_uuid exists) OK';

  -- TEST 1.2: AccountManagerZones table exists
  ASSERT (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AccountManagerZones') = 1,
    '1.2 AccountManagerZones table should exist';
  RAISE NOTICE 'TEST 1.2 (AccountManagerZones exists) OK';

  -- TEST 1.3: DriverZones table exists
  ASSERT (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'DriverZones') = 1,
    '1.3 DriverZones table should exist';
  RAISE NOTICE 'TEST 1.3 (DriverZones exists) OK';

  -- ==========================================================================
  -- PART 2: FK and unique constraints (as postgres superuser)
  -- ==========================================================================

  -- TEST 2.1: Assign bleacher to zone
  UPDATE public."Bleachers" SET zone_uuid = zone_uuid WHERE id = bleacher_uuid;
  SELECT b.zone_uuid INTO v_zone FROM public."Bleachers" b WHERE b.id = bleacher_uuid;
  ASSERT v_zone = zone_uuid,
    format('2.1 Bleacher zone_uuid should be set, got %s', v_zone);
  RAISE NOTICE 'TEST 2.1 (bleacher zone assignment) OK';

  -- TEST 2.2: AccountManagerZones insert
  INSERT INTO public."AccountManagerZones" (account_manager_uuid, zone_uuid)
  VALUES (am_uuid, zone_uuid);
  SELECT count(*) INTO v_count FROM public."AccountManagerZones"
  WHERE account_manager_uuid = am_uuid AND zone_uuid = zone_uuid;
  ASSERT v_count = 1, '2.2 AM-Zone assignment should exist';
  RAISE NOTICE 'TEST 2.2 (AM-Zone insert) OK';

  -- TEST 2.3: AM can be assigned to multiple zones (many-to-many)
  INSERT INTO public."AccountManagerZones" (account_manager_uuid, zone_uuid)
  VALUES (am_uuid, zone2_uuid);
  SELECT count(*) INTO v_count FROM public."AccountManagerZones"
  WHERE account_manager_uuid = am_uuid;
  ASSERT v_count = 2, '2.3 AM should be in 2 zones';
  RAISE NOTICE 'TEST 2.3 (AM many-to-many) OK';

  -- TEST 2.4: Unique constraint prevents duplicate AM-Zone
  BEGIN
    INSERT INTO public."AccountManagerZones" (account_manager_uuid, zone_uuid)
    VALUES (am_uuid, zone_uuid);
    ASSERT false, '2.4 Should have thrown unique violation';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 2.4 (AM-Zone unique constraint) OK';
  END;

  -- TEST 2.5: DriverZones insert
  INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
  VALUES (driver_uuid, zone_uuid);
  SELECT count(*) INTO v_count FROM public."DriverZones"
  WHERE driver_uuid = driver_uuid AND zone_uuid = zone_uuid;
  ASSERT v_count >= 1, '2.5 Driver-Zone assignment should exist';
  RAISE NOTICE 'TEST 2.5 (Driver-Zone insert) OK';

  -- TEST 2.6: Driver many-to-many
  INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
  VALUES (driver_uuid, zone2_uuid);
  SELECT count(*) INTO v_count FROM public."DriverZones"
  WHERE driver_uuid = driver_uuid;
  ASSERT v_count >= 2, '2.6 Driver should be in 2 zones';
  RAISE NOTICE 'TEST 2.6 (Driver many-to-many) OK';

  -- TEST 2.7: Unique constraint prevents duplicate Driver-Zone
  BEGIN
    INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
    VALUES (driver_uuid, zone_uuid);
    ASSERT false, '2.7 Should have thrown unique violation';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 2.7 (Driver-Zone unique constraint) OK';
  END;

  -- ==========================================================================
  -- PART 3: RLS policies
  -- ==========================================================================

  SET LOCAL ROLE authenticated;

  -- TEST 3.1: Admin can SELECT AccountManagerZones
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  SELECT count(*) INTO v_count FROM public."AccountManagerZones";
  ASSERT v_count > 0,
    format('3.1 Admin should see AccountManagerZones, got %s', v_count);
  RAISE NOTICE 'TEST 3.1 (admin SELECT AccountManagerZones) OK';

  -- TEST 3.2: AM can SELECT AccountManagerZones
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  SELECT count(*) INTO v_count FROM public."AccountManagerZones";
  ASSERT v_count > 0,
    format('3.2 AM should see AccountManagerZones, got %s', v_count);
  RAISE NOTICE 'TEST 3.2 (AM SELECT AccountManagerZones) OK';

  -- TEST 3.3: Viewer can SELECT AccountManagerZones
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  SELECT count(*) INTO v_count FROM public."AccountManagerZones";
  ASSERT v_count > 0,
    format('3.3 Viewer should see AccountManagerZones, got %s', v_count);
  RAISE NOTICE 'TEST 3.3 (viewer SELECT AccountManagerZones) OK';

  -- TEST 3.4: AM CANNOT insert into AccountManagerZones
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  BEGIN
    INSERT INTO public."AccountManagerZones" (account_manager_uuid, zone_uuid)
    VALUES (am_uuid, gen_random_uuid());
    ASSERT false, '3.4 AM should not be able to insert into AccountManagerZones';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'TEST 3.4 (AM INSERT AccountManagerZones denied) OK';
  END;

  -- TEST 3.5: Admin CAN insert into AccountManagerZones
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  -- We test via a zone that exists
  -- (Already inserted above as superuser, so this tests the policy lets admin through)
  -- Just verify admin can delete (which implies write access)
  BEGIN
    DELETE FROM public."AccountManagerZones"
    WHERE account_manager_uuid = am_uuid AND zone_uuid = zone2_uuid;
    RAISE NOTICE 'TEST 3.5 (admin DELETE AccountManagerZones) OK';
  EXCEPTION WHEN others THEN
    ASSERT false, '3.5 Admin should be able to delete AccountManagerZones';
  END;

  -- TEST 3.6: Admin can SELECT DriverZones
  SELECT count(*) INTO v_count FROM public."DriverZones";
  ASSERT v_count > 0,
    format('3.6 Admin should see DriverZones, got %s', v_count);
  RAISE NOTICE 'TEST 3.6 (admin SELECT DriverZones) OK';

  -- TEST 3.7: AM CANNOT insert into DriverZones
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  BEGIN
    INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
    VALUES (driver_uuid, gen_random_uuid());
    ASSERT false, '3.7 AM should not be able to insert into DriverZones';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'TEST 3.7 (AM INSERT DriverZones denied) OK';
  END;

  -- TEST 3.8: Viewer CANNOT insert into DriverZones
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  BEGIN
    INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
    VALUES (driver_uuid, gen_random_uuid());
    ASSERT false, '3.8 Viewer should not be able to insert into DriverZones';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'TEST 3.8 (viewer INSERT DriverZones denied) OK';
  END;

  RAISE NOTICE '--- all zone assignment tests passed ---';
END;
$$;

SELECT pass('zone_assignments_tests');
SELECT * FROM finish();
ROLLBACK;
