-- ============================================================================
-- Tests for WorkTrackerTypes / WorkTrackerTypeQboAccounts RLS: writes are
-- admin-only, reads stay admin+account_manager.
-- Migration: 20260909140000_work_tracker_types_admin_only_writes.sql
-- ============================================================================
-- Run against a local Supabase DB after migrations are applied:
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/work_tracker_types_admin_only_writes.test.sql
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
  user_admin  UUID;
  user_am     UUID;

  clerk_admin TEXT := 'clerk_wtt_admin';
  clerk_am    TEXT := 'clerk_wtt_am';

  am_id       UUID;
  type_id     UUID;
  conn_id     UUID;
  qbo_id      UUID;
  v_count     INTEGER;
BEGIN
  RAISE NOTICE '--- WorkTrackerTypes / WorkTrackerTypeQboAccounts admin-only-writes RLS tests ---';

  -- ==========================================================================
  -- SETUP (as postgres, bypassing RLS)
  -- ==========================================================================
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('WTT', 'Admin', 'wtt_admin@test.com', clerk_admin, true, false)
  RETURNING id INTO user_admin;

  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('WTT', 'AM', 'wtt_am@test.com', clerk_am, false, false)
  RETURNING id INTO user_am;

  INSERT INTO public."AccountManagers" (user_uuid, is_active)
  VALUES (user_am, true)
  RETURNING id INTO am_id;

  INSERT INTO public."WorkTrackerTypes" (display_name, sort_order)
  VALUES ('WTT Test Type', 999)
  RETURNING id INTO type_id;

  INSERT INTO public."QboConnections" (display_name, encrypted_token_value, realm_id)
  VALUES ('WTT Test Co', 'x', 'wtt-realm-1')
  RETURNING id INTO conn_id;

  -- ==========================================================================
  -- RLS (run as authenticated so policies apply)
  -- ==========================================================================
  SET LOCAL ROLE authenticated;

  -- TEST 1: account manager can SELECT WorkTrackerTypes (Type dropdown needs this)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

  SELECT count(*) INTO v_count FROM public."WorkTrackerTypes" WHERE id = type_id;
  ASSERT v_count = 1, format('T1 AM select WorkTrackerTypes: expected 1, got %s', v_count);
  RAISE NOTICE 'TEST 1 (account manager can select WorkTrackerTypes) ✓';

  -- TEST 2: account manager cannot INSERT/UPDATE/DELETE WorkTrackerTypes
  BEGIN
    INSERT INTO public."WorkTrackerTypes" (display_name, sort_order) VALUES ('AM Type', 998);
    ASSERT false, 'T2 AM insert on WorkTrackerTypes should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  UPDATE public."WorkTrackerTypes" SET display_name = 'Hacked' WHERE id = type_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, format('T2 AM update WorkTrackerTypes: expected 0 updated, got %s', v_count);

  DELETE FROM public."WorkTrackerTypes" WHERE id = type_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, format('T2 AM delete WorkTrackerTypes: expected 0 deleted, got %s', v_count);
  RAISE NOTICE 'TEST 2 (account manager cannot write WorkTrackerTypes) ✓';

  -- TEST 3: account manager cannot INSERT into WorkTrackerTypeQboAccounts
  -- (SELECT is exercised separately below, once a row exists to read.)
  BEGIN
    INSERT INTO public."WorkTrackerTypeQboAccounts"
      (work_tracker_type_uuid, qbo_connection_uuid, qbo_account_id)
    VALUES (type_id, conn_id, 'AM-ACCT-1');
    ASSERT false, 'T3 AM insert on WorkTrackerTypeQboAccounts should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  RAISE NOTICE 'TEST 3 (account manager cannot insert WorkTrackerTypeQboAccounts) ✓';

  -- TEST 4: admin still has full CRUD on both tables
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

  UPDATE public."WorkTrackerTypes" SET display_name = 'WTT Test Type (renamed)' WHERE id = type_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, format('T4 admin update WorkTrackerTypes: expected 1, got %s', v_count);

  INSERT INTO public."WorkTrackerTypeQboAccounts"
    (work_tracker_type_uuid, qbo_connection_uuid, qbo_account_id)
  VALUES (type_id, conn_id, 'ADMIN-ACCT-1')
  RETURNING id INTO qbo_id;

  UPDATE public."WorkTrackerTypeQboAccounts" SET qbo_account_id = 'ADMIN-ACCT-2' WHERE id = qbo_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1,
    format('T4 admin update WorkTrackerTypeQboAccounts: expected 1, got %s', v_count);
  RAISE NOTICE 'TEST 4 (admin → full CRUD on both tables) ✓';

  -- TEST 5: account manager can still SELECT WorkTrackerTypeQboAccounts
  -- (needed by /api/quickbooks/create-bill, which any account manager can trigger)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

  SELECT count(*) INTO v_count
    FROM public."WorkTrackerTypeQboAccounts" WHERE id = qbo_id;
  ASSERT v_count = 1, format('T5 AM select WorkTrackerTypeQboAccounts: expected 1, got %s', v_count);
  RAISE NOTICE 'TEST 5 (account manager can still select WorkTrackerTypeQboAccounts) ✓';

  -- TEST 6: account manager cannot UPDATE/DELETE WorkTrackerTypeQboAccounts
  UPDATE public."WorkTrackerTypeQboAccounts" SET qbo_account_id = 'AM-HACKED' WHERE id = qbo_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0,
    format('T6 AM update WorkTrackerTypeQboAccounts: expected 0 updated, got %s', v_count);

  DELETE FROM public."WorkTrackerTypeQboAccounts" WHERE id = qbo_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0,
    format('T6 AM delete WorkTrackerTypeQboAccounts: expected 0 deleted, got %s', v_count);
  RAISE NOTICE 'TEST 6 (account manager cannot write WorkTrackerTypeQboAccounts) ✓';

  RESET ROLE;

  RAISE NOTICE '--- all WorkTrackerTypes admin-only-writes RLS tests passed ---';
END;
$$;

SELECT ok(true, 'all assertions passed');
SELECT * FROM finish();

ROLLBACK;
