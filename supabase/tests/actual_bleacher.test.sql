-- ============================================================================
-- Tests for the actual-bleacher swap notification
--
-- The driver confirms which bleacher they really took while standing in the
-- warehouse, often offline; the row reaches Postgres hours later. So the
-- manager's notification has to be produced server-side, on the row landing —
-- never by the client that wrote it.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  manager_id   UUID;
  driver_id    UUID;
  b_assigned   UUID;
  b_actual     UUID;
  b_third      UUID;
  wt_swap      UUID;
  wt_same      UUID;
  wt_orphan    UUID;
  wt_self      UUID;
  wt_check     UUID;
  v_count      INTEGER;
  v_baseline   INTEGER;
  v_body       TEXT;
BEGIN
  RAISE NOTICE '--- actual bleacher swap notification tests ---';

  -- The local DB is seeded with unrelated notifications; count deltas only.
  SELECT count(*) INTO v_baseline FROM "Notifications";

  INSERT INTO "Users" (first_name, last_name, email, clerk_user_id, is_admin)
  VALUES ('Test', 'Manager', 'ab_manager@test.com', 'clerk_ab_manager', true)
  RETURNING id INTO manager_id;

  INSERT INTO "Users" (first_name, last_name, email, clerk_user_id, is_admin)
  VALUES ('Test', 'Driver', 'ab_driver@test.com', 'clerk_ab_driver', false)
  RETURNING id INTO driver_id;

  INSERT INTO "Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (8001, 5, 50) RETURNING id INTO b_assigned;
  INSERT INTO "Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (8002, 5, 50) RETURNING id INTO b_actual;
  INSERT INTO "Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (8003, 5, 50) RETURNING id INTO b_third;

  -- The driver's write arrives with the driver's JWT, not the manager's.
  PERFORM set_config('request.jwt.claims', '{"sub":"clerk_ab_driver"}', true);

  -- T1: NULL -> a different bleacher notifies the tracker's creator once.
  INSERT INTO "WorkTrackers" (id, bleacher_uuid, created_by_user_uuid)
  VALUES (gen_random_uuid(), b_assigned, manager_id)
  RETURNING id INTO wt_swap;

  UPDATE "WorkTrackers"
  SET actual_bleacher_uuid = b_actual, bleacher_change_reason = 'hard_to_access'
  WHERE id = wt_swap;

  SELECT count(*) INTO v_count FROM "Notifications" WHERE user_id = manager_id;
  ASSERT v_count = 1, format('T1 FAIL: expected 1 notification, got %s', v_count);
  RAISE NOTICE 'T1 swap on first confirmation notifies the creator ✓';

  -- T2: The body names both bleachers and the reason, so the manager can
  --     reconcile without opening the app.
  SELECT body INTO v_body FROM "Notifications" WHERE user_id = manager_id;
  ASSERT v_body LIKE '%8002%', format('T2 FAIL: body should name the actual bleacher, got %s', v_body);
  ASSERT v_body LIKE '%8001%', format('T2 FAIL: body should name the assigned bleacher, got %s', v_body);
  ASSERT v_body ILIKE '%hard to get to%', format('T2 FAIL: body should carry the reason label, got %s', v_body);
  RAISE NOTICE 'T2 body carries both bleacher numbers and the reason label ✓';

  -- T3: Any later update of the same row must stay silent — the guard fires on
  --     the NULL -> value transition only.
  UPDATE "WorkTrackers" SET notes = 'later edit' WHERE id = wt_swap;
  UPDATE "WorkTrackers" SET actual_bleacher_uuid = b_third WHERE id = wt_swap;

  SELECT count(*) INTO v_count FROM "Notifications" WHERE user_id = manager_id;
  ASSERT v_count = 1, format('T3 FAIL: later updates must not re-notify, got %s', v_count);
  RAISE NOTICE 'T3 subsequent updates do not re-notify ✓';

  -- T4: Confirming the assigned bleacher is not news.
  INSERT INTO "WorkTrackers" (id, bleacher_uuid, created_by_user_uuid)
  VALUES (gen_random_uuid(), b_assigned, manager_id)
  RETURNING id INTO wt_same;

  UPDATE "WorkTrackers" SET actual_bleacher_uuid = b_assigned WHERE id = wt_same;

  SELECT count(*) INTO v_count FROM "Notifications" WHERE user_id = manager_id;
  ASSERT v_count = 1, format('T4 FAIL: confirming the assigned bleacher must be silent, got %s', v_count);
  RAISE NOTICE 'T4 confirming the assigned bleacher is silent ✓';

  -- T5: A manager reverting their own correction must not notify either.
  UPDATE "WorkTrackers"
  SET actual_bleacher_uuid = b_assigned, bleacher_change_reason = NULL
  WHERE id = wt_swap;

  SELECT count(*) INTO v_count FROM "Notifications" WHERE user_id = manager_id;
  ASSERT v_count = 1, format('T5 FAIL: reverting must not notify, got %s', v_count);
  RAISE NOTICE 'T5 reverting to the assigned bleacher is silent ✓';

  -- T6: No creator to notify — must not raise, must not insert.
  INSERT INTO "WorkTrackers" (id, bleacher_uuid, created_by_user_uuid)
  VALUES (gen_random_uuid(), b_assigned, NULL)
  RETURNING id INTO wt_orphan;

  UPDATE "WorkTrackers"
  SET actual_bleacher_uuid = b_actual, bleacher_change_reason = 'damaged'
  WHERE id = wt_orphan;

  SELECT count(*) - v_baseline INTO v_count FROM "Notifications";
  ASSERT v_count = 1, format('T6 FAIL: a creatorless tracker must notify nobody, got %s', v_count);
  RAISE NOTICE 'T6 tracker without a creator notifies nobody ✓';

  -- T7: The manager fixing the bleacher from the web is not told about their
  --     own edit.
  PERFORM set_config('request.jwt.claims', '{"sub":"clerk_ab_manager"}', true);

  INSERT INTO "WorkTrackers" (id, bleacher_uuid, created_by_user_uuid)
  VALUES (gen_random_uuid(), b_assigned, manager_id)
  RETURNING id INTO wt_self;

  UPDATE "WorkTrackers"
  SET actual_bleacher_uuid = b_actual, bleacher_change_reason = 'other'
  WHERE id = wt_self;

  SELECT count(*) INTO v_count FROM "Notifications" WHERE user_id = manager_id;
  ASSERT v_count = 1, format('T7 FAIL: self-inflicted swap must be silent, got %s', v_count);
  RAISE NOTICE 'T7 manager is not notified about their own correction ✓';

  PERFORM set_config('request.jwt.claims', '{"sub":"clerk_ab_driver"}', true);

  -- T8: The value domain is enforced.
  INSERT INTO "WorkTrackers" (id, bleacher_uuid, created_by_user_uuid)
  VALUES (gen_random_uuid(), b_assigned, manager_id)
  RETURNING id INTO wt_check;

  BEGIN
    UPDATE "WorkTrackers" SET bleacher_change_reason = 'teleported_away' WHERE id = wt_check;
    ASSERT false, 'T8 FAIL: an unknown reason code should be rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'T8 unknown reason code rejected ✓';
  END;

  -- T9: But no cross-column rule — a reason alongside the assigned bleacher is
  --     accepted. A rejected write would wedge the PowerSync upload queue.
  UPDATE "WorkTrackers"
  SET actual_bleacher_uuid = b_assigned, bleacher_change_reason = 'damaged'
  WHERE id = wt_check;

  SELECT count(*) INTO v_count FROM "WorkTrackers"
  WHERE id = wt_check AND bleacher_change_reason = 'damaged';
  ASSERT v_count = 1, 'T9 FAIL: a reason without a swap must still be accepted';
  RAISE NOTICE 'T9 no cross-column CHECK on reason ✓';

  RAISE NOTICE '--- all 9 actual bleacher tests passed ---';
END;
$$;

SELECT ok(true, 'all assertions passed');

SELECT * FROM finish();

ROLLBACK;
