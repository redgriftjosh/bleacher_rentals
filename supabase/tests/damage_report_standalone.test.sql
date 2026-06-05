-- ============================================================================
-- Tests for Standalone Damage Reports migration
-- - damage_severity enum, seat_damage/haul_damage columns
-- - inspection_uuid nullable
-- - backward-compat trigger fills bleacher_uuid from inspection
-- - created_by_user_uuid column
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO public, "$user";

DO $$
DECLARE
  bleacher_id    UUID;
  inspection_id  UUID;
  wt_id          UUID;
  user_id        UUID;
  dr_standalone  UUID;
  dr_backfill    UUID;
  found_bleacher UUID;
  found_user     UUID;
  v_count        INTEGER;
BEGIN
  RAISE NOTICE '--- damage report standalone tests ---';

  -- Setup
  INSERT INTO "Users" (first_name, last_name, email, clerk_user_id, is_admin)
  VALUES ('Test', 'Driver', 'dr_standalone@test.com', 'clerk_dr_standalone', false)
  RETURNING id INTO user_id;

  INSERT INTO "Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (7777, 5, 50)
  RETURNING id INTO bleacher_id;

  INSERT INTO "WorkTrackerInspections" (id)
  VALUES (gen_random_uuid())
  RETURNING id INTO inspection_id;

  INSERT INTO "WorkTrackers" (id, bleacher_uuid, pre_inspection_uuid)
  VALUES (gen_random_uuid(), bleacher_id, inspection_id)
  RETURNING id INTO wt_id;

  -- T1: Standalone insert (no inspection_uuid)
  INSERT INTO "DamageReports" (id, bleacher_uuid, seat_damage, haul_damage, note, created_by_user_uuid)
  VALUES (gen_random_uuid(), bleacher_id, 'minor', 'major', 'standalone', user_id)
  RETURNING id INTO dr_standalone;

  SELECT count(*) INTO v_count FROM "DamageReports"
  WHERE id = dr_standalone
    AND inspection_uuid IS NULL
    AND seat_damage = 'minor'
    AND haul_damage = 'major'
    AND created_by_user_uuid = user_id;
  ASSERT v_count = 1, format('T1 FAIL: standalone insert, got %s', v_count);
  RAISE NOTICE 'T1 standalone insert with null inspection_uuid + created_by ✓';

  -- T2: Backward-compat trigger fills bleacher_uuid
  INSERT INTO "DamageReports" (id, inspection_uuid, seat_damage, haul_damage)
  VALUES (gen_random_uuid(), inspection_id, 'none', 'minor')
  RETURNING id INTO dr_backfill;

  SELECT bleacher_uuid INTO found_bleacher FROM "DamageReports" WHERE id = dr_backfill;
  ASSERT found_bleacher = bleacher_id,
    format('T2 FAIL: trigger should backfill bleacher_uuid. Expected %s, got %s', bleacher_id, found_bleacher);
  RAISE NOTICE 'T2 backward-compat trigger fills bleacher_uuid ✓';

  -- T3: Enum type exists
  SELECT count(*) INTO v_count FROM pg_type WHERE typname = 'damage_severity';
  ASSERT v_count = 1, 'T3 FAIL: damage_severity enum should exist';
  RAISE NOTICE 'T3 damage_severity enum exists ✓';

  -- T4: seat_damage column exists
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'DamageReports' AND column_name = 'seat_damage';
  ASSERT v_count = 1, 'T4 FAIL: seat_damage column should exist';
  RAISE NOTICE 'T4 seat_damage column exists ✓';

  -- T5: haul_damage column exists
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'DamageReports' AND column_name = 'haul_damage';
  ASSERT v_count = 1, 'T5 FAIL: haul_damage column should exist';
  RAISE NOTICE 'T5 haul_damage column exists ✓';

  -- T6: created_by_user_uuid column exists
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'DamageReports' AND column_name = 'created_by_user_uuid';
  ASSERT v_count = 1, 'T6 FAIL: created_by_user_uuid column should exist';
  RAISE NOTICE 'T6 created_by_user_uuid column exists ✓';

  -- T7: inspection_uuid is nullable
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'DamageReports' AND column_name = 'inspection_uuid' AND is_nullable = 'YES';
  ASSERT v_count = 1, 'T7 FAIL: inspection_uuid should be nullable';
  RAISE NOTICE 'T7 inspection_uuid is nullable ✓';

  RAISE NOTICE '--- all 7 standalone tests passed ---';
END;
$$;

ROLLBACK;
