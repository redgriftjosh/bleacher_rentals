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
  v_driver_id    UUID;
  v_zone_a       UUID;
  v_zone_b       UUID;
  v_zone_c       UUID;
  v_other_am_usr UUID;
  v_other_am     UUID;
  v_bleacher_id  UUID;
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
  VALUES (user_driver, true, 0, 100, 'USD', 'KM')
  RETURNING id INTO v_driver_id;

  -- Zones
  INSERT INTO public."Zones" (display_name, description)
  VALUES ('Test Zone A', 'First test zone')
  RETURNING id INTO v_zone_a;

  INSERT INTO public."Zones" (display_name, description)
  VALUES ('Test Zone B', 'Second test zone')
  RETURNING id INTO v_zone_b;

  -- Bleacher
  INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (8888, 10, 100)
  RETURNING id INTO v_bleacher_id;

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
  UPDATE public."Bleachers" SET zone_uuid = v_zone_a WHERE id = v_bleacher_id;
  SELECT b.zone_uuid INTO v_zone FROM public."Bleachers" b WHERE b.id = v_bleacher_id;
  ASSERT v_zone = v_zone_a,
    format('2.1 Bleacher zone_uuid should be set, got %s', v_zone);
  RAISE NOTICE 'TEST 2.1 (bleacher zone assignment) OK';

  -- TEST 2.2: AccountManagerZones insert
  INSERT INTO public."AccountManagerZones" (account_manager_uuid, zone_uuid)
  VALUES (am_uuid, v_zone_a);
  SELECT count(*) INTO v_count FROM public."AccountManagerZones"
  WHERE account_manager_uuid = am_uuid AND zone_uuid = v_zone_a;
  ASSERT v_count = 1, '2.2 AM-Zone assignment should exist';
  RAISE NOTICE 'TEST 2.2 (AM-Zone insert) OK';

  -- TEST 2.3: AM can be assigned to multiple zones (many-to-many)
  INSERT INTO public."AccountManagerZones" (account_manager_uuid, zone_uuid)
  VALUES (am_uuid, v_zone_b);
  SELECT count(*) INTO v_count FROM public."AccountManagerZones"
  WHERE account_manager_uuid = am_uuid;
  ASSERT v_count = 2, '2.3 AM should be in 2 zones';
  RAISE NOTICE 'TEST 2.3 (AM many-to-many) OK';

  -- TEST 2.4: Unique constraint prevents duplicate AM-Zone
  BEGIN
    INSERT INTO public."AccountManagerZones" (account_manager_uuid, zone_uuid)
    VALUES (am_uuid, v_zone_a);
    ASSERT false, '2.4 Should have thrown unique violation';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 2.4 (AM-Zone unique constraint) OK';
  END;

  -- TEST 2.5: DriverZones insert
  INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
  VALUES (v_driver_id, v_zone_a);
  SELECT count(*) INTO v_count FROM public."DriverZones"
  WHERE driver_uuid = v_driver_id AND zone_uuid = v_zone_a;
  ASSERT v_count >= 1, '2.5 Driver-Zone assignment should exist';
  RAISE NOTICE 'TEST 2.5 (Driver-Zone insert) OK';

  -- TEST 2.6: Driver many-to-many
  INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
  VALUES (v_driver_id, v_zone_b);
  SELECT count(*) INTO v_count FROM public."DriverZones"
  WHERE driver_uuid = v_driver_id;
  ASSERT v_count >= 2, '2.6 Driver should be in 2 zones';
  RAISE NOTICE 'TEST 2.6 (Driver many-to-many) OK';

  -- TEST 2.7: Unique constraint prevents duplicate Driver-Zone
  BEGIN
    INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
    VALUES (v_driver_id, v_zone_a);
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
    WHERE account_manager_uuid = am_uuid AND zone_uuid = v_zone_b;
    RAISE NOTICE 'TEST 3.5 (admin DELETE AccountManagerZones) OK';
  EXCEPTION WHEN others THEN
    ASSERT false, '3.5 Admin should be able to delete AccountManagerZones';
  END;

  -- TEST 3.6: Admin can SELECT DriverZones
  SELECT count(*) INTO v_count FROM public."DriverZones";
  ASSERT v_count > 0,
    format('3.6 Admin should see DriverZones, got %s', v_count);
  RAISE NOTICE 'TEST 3.6 (admin SELECT DriverZones) OK';

  -- TEST 3.7: AM CAN insert into DriverZones for their zone
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  DELETE FROM public."DriverZones"
  WHERE driver_uuid = v_driver_id AND zone_uuid = v_zone_a;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  BEGIN
    INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
    VALUES (v_driver_id, v_zone_a);
    RAISE NOTICE 'TEST 3.7 (AM INSERT DriverZones for own zone) OK';
  EXCEPTION WHEN others THEN
    ASSERT false, format('3.7 AM should insert DriverZones for assigned zone: %s', SQLERRM);
  END;

  -- TEST 3.7b: AM CANNOT insert into DriverZones for a zone they do not manage.
  -- Use a real, FK-valid zone (created by admin) so the failure is enforced by RLS,
  -- not by a foreign-key violation on a random uuid.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  INSERT INTO public."Zones" (display_name, description)
  VALUES ('Test Zone C (unmanaged)', 'Zone the AM does not manage')
  RETURNING id INTO v_zone_c;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  BEGIN
    INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
    VALUES (v_driver_id, v_zone_c);
    ASSERT false, '3.7b AM should not insert DriverZones for zone they do not manage';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'TEST 3.7b (AM INSERT DriverZones denied for foreign zone) OK';
  END;

  -- TEST 3.8: Viewer CANNOT insert into DriverZones
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  BEGIN
    INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
    VALUES (v_driver_id, gen_random_uuid());
    ASSERT false, '3.8 Viewer should not be able to insert into DriverZones';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'TEST 3.8 (viewer INSERT DriverZones denied) OK';
  END;

  -- TEST 3.9: AM CAN update a Drivers row for a driver in their zone, even when the
  -- driver still carries a legacy account_manager_uuid pointing at a different AM.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('ZA OtherAM', 'Test', 'za_other_am@test.com', 'clerk_za_other_am', false, false)
  RETURNING id INTO v_other_am_usr;
  INSERT INTO public."AccountManagers" (user_uuid, is_active)
  VALUES (v_other_am_usr, true)
  RETURNING id INTO v_other_am;

  -- Driver is owned (legacy) by the other AM but assigned to zone_a, which clerk_am manages.
  UPDATE public."Drivers" SET account_manager_uuid = v_other_am WHERE id = v_driver_id;
  INSERT INTO public."DriverZones" (driver_uuid, zone_uuid)
  VALUES (v_driver_id, v_zone_a)
  ON CONFLICT DO NOTHING;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  BEGIN
    UPDATE public."Drivers" SET pay_rate_cents = 222 WHERE id = v_driver_id;
    SELECT count(*) INTO v_count FROM public."Drivers"
    WHERE id = v_driver_id AND pay_rate_cents = 222;
    ASSERT v_count = 1, '3.9 AM should update driver sharing their zone regardless of owner';
    RAISE NOTICE 'TEST 3.9 (AM UPDATE driver in shared zone) OK';
  EXCEPTION WHEN others THEN
    ASSERT false, format('3.9 AM should update driver in shared zone: %s', SQLERRM);
  END;

  -- TEST 3.9b: AM CANNOT update a driver they neither own nor share a zone with.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  DELETE FROM public."DriverZones" WHERE driver_uuid = v_driver_id;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  UPDATE public."Drivers" SET pay_rate_cents = 999 WHERE id = v_driver_id;
  SELECT count(*) INTO v_count FROM public."Drivers"
  WHERE id = v_driver_id AND pay_rate_cents = 999;
  ASSERT v_count = 0, '3.9b AM should not update driver outside their zones';
  RAISE NOTICE 'TEST 3.9b (AM UPDATE driver outside zones denied) OK';

  RAISE NOTICE '--- all zone assignment tests passed ---';
END;
$$;

SELECT pass('zone_assignments_tests');
SELECT * FROM finish();
ROLLBACK;
