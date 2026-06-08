-- ============================================================================
-- Tests for driver self-service RLS policies
-- ============================================================================
-- Run via docker:
--   docker exec -i $(docker ps --filter "name=supabase_db" --format "{{.ID}}" | head -1) \
--     psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/driver_rls.test.sql
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  user_driver    UUID;
  user_driver2   UUID;
  user_noroles   UUID;

  clerk_driver   TEXT := 'clerk_driver_rls_test';
  clerk_driver2  TEXT := 'clerk_driver2_rls_test';
  clerk_noroles  TEXT := 'clerk_noroles_rls_test';

  driver_id      UUID;
  driver2_id     UUID;
  bleacher_id    UUID;
  address_id     UUID;
  vehicle_id     UUID;
  inspection_id  UUID;
  dr_id          UUID;
  drp_id         UUID;
  ip_id          UUID;
  du_id          UUID;

  v_count        INTEGER;
BEGIN
  RAISE NOTICE '--- driver RLS tests ---';

  -- ══════════════════════════════════════════════════════════════
  -- SETUP (as superuser, RLS bypassed)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO "Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('Driver', 'One', 'driver1_rls@test.com', clerk_driver, false, false)
  RETURNING id INTO user_driver;

  INSERT INTO "Drivers" (user_uuid, is_active)
  VALUES (user_driver, true)
  RETURNING id INTO driver_id;

  INSERT INTO "Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('Driver', 'Two', 'driver2_rls@test.com', clerk_driver2, false, false)
  RETURNING id INTO user_driver2;

  INSERT INTO "Drivers" (user_uuid, is_active)
  VALUES (user_driver2, true)
  RETURNING id INTO driver2_id;

  INSERT INTO "Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('No', 'Roles', 'noroles_rls@test.com', clerk_noroles, false, false)
  RETURNING id INTO user_noroles;

  INSERT INTO "Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (8888, 5, 50)
  RETURNING id INTO bleacher_id;

  -- ══════════════════════════════════════════════════════════════
  -- Switch to authenticated role (RLS active)
  -- ══════════════════════════════════════════════════════════════
  SET LOCAL ROLE authenticated;

  -- Simulate driver JWT
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_driver)::text, true);

  -- ── T1: Driver INSERT DamageReports with created_by_user_uuid ──
  INSERT INTO "DamageReports" (id, bleacher_uuid, seat_damage, haul_damage, note, created_by_user_uuid)
  VALUES (gen_random_uuid(), bleacher_id, 'minor', 'major', 'test damage', user_driver)
  RETURNING id INTO dr_id;
  ASSERT dr_id IS NOT NULL, 'T1 FAIL: driver should INSERT DamageReports';
  RAISE NOTICE 'T1  driver INSERT DamageReports with created_by ✓';

  -- ── T2: Driver SELECT DamageReports ──
  SELECT count(*) INTO v_count FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_count = 1, format('T2 FAIL: expected 1, got %s', v_count);
  RAISE NOTICE 'T2  driver SELECT DamageReports ✓';

  -- ── T2b: created_by_user_uuid is set correctly ──
  SELECT count(*) INTO v_count FROM "DamageReports"
  WHERE id = dr_id AND created_by_user_uuid = user_driver;
  ASSERT v_count = 1, format('T2b FAIL: created_by should be user_driver, got %s', v_count);
  RAISE NOTICE 'T2b created_by_user_uuid stored correctly ✓';

  -- ── T3: Driver INSERT DamageReportPhotos ──
  INSERT INTO "DamageReportPhotos" (id, damage_report_uuid, photo_path)
  VALUES (gen_random_uuid(), dr_id, 'test/photo.jpg')
  RETURNING id INTO drp_id;
  ASSERT drp_id IS NOT NULL, 'T3 FAIL';
  RAISE NOTICE 'T3  driver INSERT DamageReportPhotos ✓';

  -- ── T4: Driver INSERT WorkTrackerInspections ──
  INSERT INTO "WorkTrackerInspections" (id)
  VALUES (gen_random_uuid())
  RETURNING id INTO inspection_id;
  ASSERT inspection_id IS NOT NULL, 'T4 FAIL';
  RAISE NOTICE 'T4  driver INSERT WorkTrackerInspections ✓';

  -- ── T5: Driver INSERT InspectionPhotos ──
  INSERT INTO "InspectionPhotos" (id, inspection_uuid, storage_path)
  VALUES (gen_random_uuid(), inspection_id, 'test/insp.jpg')
  RETURNING id INTO ip_id;
  ASSERT ip_id IS NOT NULL, 'T5 FAIL';
  RAISE NOTICE 'T5  driver INSERT InspectionPhotos ✓';

  -- ── T6: Driver SELECT own Drivers row ──
  SELECT count(*) INTO v_count FROM "Drivers" WHERE id = driver_id;
  ASSERT v_count = 1, format('T6 FAIL: expected 1, got %s', v_count);
  RAISE NOTICE 'T6  driver SELECT own Drivers row ✓';

  -- ── T7: Driver CANNOT see other driver ──
  SELECT count(*) INTO v_count FROM "Drivers" WHERE id = driver2_id;
  ASSERT v_count = 0, format('T7 FAIL: expected 0, got %s', v_count);
  RAISE NOTICE 'T7  driver CANNOT SELECT other driver ✓';

  -- ── T8: Driver UPDATE own Drivers row ──
  UPDATE "Drivers" SET is_active = true WHERE id = driver_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, format('T8 FAIL: expected 1, got %s', v_count);
  RAISE NOTICE 'T8  driver UPDATE own Drivers row ✓';

  -- ── T9: Driver INSERT Addresses ──
  INSERT INTO "Addresses" (id, street, city, state_province, zip_postal)
  VALUES (gen_random_uuid(), '123 Test St', 'Testville', 'ON', 'T1T 1T1')
  RETURNING id INTO address_id;
  ASSERT address_id IS NOT NULL, 'T9 FAIL';
  RAISE NOTICE 'T9  driver INSERT Addresses ✓';

  -- ── T10: Driver UPDATE Addresses ──
  UPDATE "Addresses" SET street = '456 Updated St' WHERE id = address_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, format('T10 FAIL: expected 1, got %s', v_count);
  RAISE NOTICE 'T10 driver UPDATE Addresses ✓';

  -- ── T11: Driver INSERT Vehicles ──
  INSERT INTO "Vehicles" (id, year, make, model)
  VALUES (gen_random_uuid(), 2020, 'Ford', 'F-150')
  RETURNING id INTO vehicle_id;
  ASSERT vehicle_id IS NOT NULL, 'T11 FAIL';
  RAISE NOTICE 'T11 driver INSERT Vehicles ✓';

  -- ── T12: Driver UPDATE Vehicles ──
  UPDATE "Vehicles" SET model = 'F-250' WHERE id = vehicle_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, format('T12 FAIL: expected 1, got %s', v_count);
  RAISE NOTICE 'T12 driver UPDATE Vehicles ✓';

  -- ── T13: Driver INSERT own DriverUnavailability ──
  INSERT INTO "DriverUnavailability" (id, driver_uuid, date_unavailable)
  VALUES (gen_random_uuid(), driver_id, '2026-12-25')
  RETURNING id INTO du_id;
  ASSERT du_id IS NOT NULL, 'T13 FAIL';
  RAISE NOTICE 'T13 driver INSERT own DriverUnavailability ✓';

  -- ── T14: Driver CANNOT INSERT DriverUnavailability for other driver ──
  BEGIN
    INSERT INTO "DriverUnavailability" (id, driver_uuid, date_unavailable)
    VALUES (gen_random_uuid(), driver2_id, '2026-12-25');
    ASSERT false, 'T14 FAIL: should have been blocked';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'T14 driver CANNOT INSERT DriverUnavailability for other ✓';
  END;

  -- ── T15: Driver DELETE own DriverUnavailability ──
  DELETE FROM "DriverUnavailability" WHERE id = du_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, format('T15 FAIL: expected 1, got %s', v_count);
  RAISE NOTICE 'T15 driver DELETE own DriverUnavailability ✓';

  -- ══════════════════════════════════════════════════════════════
  -- No-roles user tests
  -- ══════════════════════════════════════════════════════════════
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_noroles)::text, true);

  -- ── T16: No-roles CANNOT INSERT DamageReports ──
  BEGIN
    INSERT INTO "DamageReports" (id, bleacher_uuid, seat_damage, haul_damage)
    VALUES (gen_random_uuid(), bleacher_id, 'none', 'none');
    ASSERT false, 'T16 FAIL: should have been blocked';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'T16 no-roles CANNOT INSERT DamageReports ✓';
  END;

  -- ── T17: No-roles CANNOT SELECT Drivers ──
  SELECT count(*) INTO v_count FROM "Drivers";
  ASSERT v_count = 0, format('T17 FAIL: expected 0, got %s', v_count);
  RAISE NOTICE 'T17 no-roles CANNOT SELECT Drivers ✓';

  RAISE NOTICE '--- all 17 driver RLS tests passed ---';

  RESET ROLE;
END;
$$;

SELECT ok(true, 'all assertions passed');

SELECT * FROM finish();

ROLLBACK;
