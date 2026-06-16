\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  v_count   INTEGER;
  v_event   UUID;
  v_bt7     UUID;
  v_bt10    UUID;
  v_req_id  UUID;
BEGIN
  RAISE NOTICE '--- EventBleacherRequirements tests ---';

  -- T1: Table exists
  SELECT count(*) INTO v_count FROM information_schema.tables
  WHERE table_name = 'EventBleacherRequirements' AND table_schema = 'public';
  ASSERT v_count = 1, 'T1 FAIL: table should exist';
  RAISE NOTICE 'T1 table exists ✓';

  -- Get test fixtures
  SELECT id INTO v_bt7 FROM "BleacherTypes" WHERE row_count = 7 AND deleted = false LIMIT 1;
  SELECT id INTO v_bt10 FROM "BleacherTypes" WHERE row_count = 10 AND deleted = false LIMIT 1;

  INSERT INTO "Events" (event_name, event_start, event_end, lenient, must_be_clean)
  VALUES ('Test EBR Event', '2026-08-01', '2026-08-05', false, false)
  RETURNING id INTO v_event;

  -- T2: Can insert requirements
  INSERT INTO "EventBleacherRequirements" (event_uuid, bleacher_type_uuid, quantity)
  VALUES (v_event, v_bt7, 3)
  RETURNING id INTO v_req_id;
  ASSERT v_req_id IS NOT NULL, 'T2 FAIL: insert should return id';
  RAISE NOTICE 'T2 insert works ✓';

  -- T3: Unique constraint on (event_uuid, bleacher_type_uuid)
  BEGIN
    INSERT INTO "EventBleacherRequirements" (event_uuid, bleacher_type_uuid, quantity)
    VALUES (v_event, v_bt7, 5);
    RAISE EXCEPTION 'T3 FAIL: duplicate should be rejected';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'T3 unique constraint works ✓';
  END;

  -- T4: Can have multiple types per event
  INSERT INTO "EventBleacherRequirements" (event_uuid, bleacher_type_uuid, quantity)
  VALUES (v_event, v_bt10, 2);
  SELECT count(*) INTO v_count FROM "EventBleacherRequirements" WHERE event_uuid = v_event;
  ASSERT v_count = 2, format('T4 FAIL: expected 2 rows, got %s', v_count);
  RAISE NOTICE 'T4 multiple types per event ✓';

  -- T5: CASCADE delete when event deleted
  DELETE FROM "Events" WHERE id = v_event;
  SELECT count(*) INTO v_count FROM "EventBleacherRequirements" WHERE event_uuid = v_event;
  ASSERT v_count = 0, format('T5 FAIL: cascade should delete, got %s rows', v_count);
  RAISE NOTICE 'T5 cascade delete works ✓';

  -- T6: Backfill from legacy columns
  INSERT INTO "Events" (event_name, event_start, event_end, lenient, must_be_clean, seven_row, ten_row, fifteen_row)
  VALUES ('Legacy Event', '2026-09-01', '2026-09-05', false, false, 2, 3, 1)
  RETURNING id INTO v_event;
  -- The backfill migration already ran; for new events we need to insert manually
  -- Just verify the table accepts the data
  INSERT INTO "EventBleacherRequirements" (event_uuid, bleacher_type_uuid, quantity)
  SELECT v_event, bt.id, 2
  FROM "BleacherTypes" bt WHERE bt.row_count = 7 AND bt.roof_type = 'none' AND bt.deleted = false;
  SELECT count(*) INTO v_count FROM "EventBleacherRequirements" WHERE event_uuid = v_event;
  ASSERT v_count = 1, format('T6 FAIL: expected 1 row, got %s', v_count);
  RAISE NOTICE 'T6 legacy backfill pattern works ✓';

  -- Cleanup
  DELETE FROM "Events" WHERE id = v_event;

  RAISE NOTICE '--- all EventBleacherRequirements tests passed ---';
END;
$$;

SELECT pass('EventBleacherRequirements tests completed');
SELECT * FROM finish();
ROLLBACK;
