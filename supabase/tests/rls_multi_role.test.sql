-- ============================================================================
-- Tests for multi-role RLS policies
-- ============================================================================
-- Run against a local Supabase DB after migrations are applied.
--
--   supabase test db
--
-- or manually:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/rls_multi_role.test.sql
--
-- Everything runs in a transaction that is ROLLED BACK at the end.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;

DO $$
DECLARE
  -- Test user UUIDs
  user_no_roles     UUID;
  user_admin        UUID;
  user_dev          UUID;
  user_viewer       UUID;
  user_am           UUID;
  user_dev_viewer   UUID;
  user_admin_all    UUID;

  -- Clerk IDs (fake, used to simulate JWT)
  clerk_no_roles    TEXT := 'clerk_no_roles';
  clerk_admin       TEXT := 'clerk_admin';
  clerk_dev         TEXT := 'clerk_dev';
  clerk_viewer      TEXT := 'clerk_viewer';
  clerk_am          TEXT := 'clerk_am';
  clerk_dev_viewer  TEXT := 'clerk_dev_viewer';
  clerk_admin_all   TEXT := 'clerk_admin_all';

  v_roles    TEXT[];
  v_count    INTEGER;
  v_ok       BOOLEAN;
BEGIN
  RAISE NOTICE '--- multi-role RLS tests ---';

  -- ==========================================================================
  -- SETUP: Create test users with different role combinations
  -- ==========================================================================

  -- User with no roles
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('No', 'Roles', 'noroles@test.com', clerk_no_roles, false, false)
  RETURNING id INTO user_no_roles;

  -- Admin only
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('Admin', 'User', 'admin@test.com', clerk_admin, true, false)
  RETURNING id INTO user_admin;

  -- Developer only
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('Dev', 'User', 'dev@test.com', clerk_dev, false, false)
  RETURNING id INTO user_dev;

  INSERT INTO public."Developers" (user_uuid, is_active, auto_subscribe_to_new_tickets)
  VALUES (user_dev, true, true);

  -- Viewer only
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('Viewer', 'User', 'viewer@test.com', clerk_viewer, false, true)
  RETURNING id INTO user_viewer;

  -- Account manager only
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('AM', 'User', 'am@test.com', clerk_am, false, false)
  RETURNING id INTO user_am;

  INSERT INTO public."AccountManagers" (user_uuid, is_active)
  VALUES (user_am, true);

  -- Developer + Viewer (the bug case)
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('DevViewer', 'User', 'devviewer@test.com', clerk_dev_viewer, false, true)
  RETURNING id INTO user_dev_viewer;

  INSERT INTO public."Developers" (user_uuid, is_active, auto_subscribe_to_new_tickets)
  VALUES (user_dev_viewer, true, true);

  -- Admin + all roles
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('Super', 'User', 'super@test.com', clerk_admin_all, true, true)
  RETURNING id INTO user_admin_all;

  INSERT INTO public."Developers" (user_uuid, is_active, auto_subscribe_to_new_tickets)
  VALUES (user_admin_all, true, true);

  INSERT INTO public."AccountManagers" (user_uuid, is_active)
  VALUES (user_admin_all, true);

  -- Insert test data into tables we'll check access for
  INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (9999, 10, 100);
  INSERT INTO public."RoadmapQuarters" (quarter, year) VALUES (1, 2999);

  -- ==========================================================================
  -- PART A: get_user_roles() returns correct arrays
  -- ==========================================================================

  -- Helper: set JWT sub claim to simulate a specific user
  -- (auth.jwt() ->> 'sub' reads from request.jwt.claims)

  -- TEST A1: No roles → empty array
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_no_roles)::text, true);
  SELECT public.get_user_roles() INTO v_roles;
  ASSERT v_roles = '{}'::text[],
    format('A1 no roles: expected {}, got %s', v_roles);
  RAISE NOTICE 'TEST A1 (no roles → empty array) ✓';

  -- TEST A2: Admin only
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  SELECT public.get_user_roles() INTO v_roles;
  ASSERT v_roles @> ARRAY['admin'] AND array_length(v_roles, 1) = 1,
    format('A2 admin only: expected {admin}, got %s', v_roles);
  RAISE NOTICE 'TEST A2 (admin only) ✓';

  -- TEST A3: Developer only
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev)::text, true);
  SELECT public.get_user_roles() INTO v_roles;
  ASSERT v_roles @> ARRAY['developer'] AND array_length(v_roles, 1) = 1,
    format('A3 developer only: expected {developer}, got %s', v_roles);
  RAISE NOTICE 'TEST A3 (developer only) ✓';

  -- TEST A4: Viewer only
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  SELECT public.get_user_roles() INTO v_roles;
  ASSERT v_roles @> ARRAY['viewer'] AND array_length(v_roles, 1) = 1,
    format('A4 viewer only: expected {viewer}, got %s', v_roles);
  RAISE NOTICE 'TEST A4 (viewer only) ✓';

  -- TEST A5: Account manager only
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  SELECT public.get_user_roles() INTO v_roles;
  ASSERT v_roles @> ARRAY['account_manager'] AND array_length(v_roles, 1) = 1,
    format('A5 account_manager only: expected {account_manager}, got %s', v_roles);
  RAISE NOTICE 'TEST A5 (account_manager only) ✓';

  -- TEST A6: Developer + Viewer (THE BUG CASE)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev_viewer)::text, true);
  SELECT public.get_user_roles() INTO v_roles;
  ASSERT v_roles @> ARRAY['developer', 'viewer'] AND array_length(v_roles, 1) = 2,
    format('A6 dev+viewer: expected {developer,viewer}, got %s', v_roles);
  RAISE NOTICE 'TEST A6 (developer + viewer → both roles) ✓';

  -- TEST A7: All 4 roles
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin_all)::text, true);
  SELECT public.get_user_roles() INTO v_roles;
  ASSERT v_roles @> ARRAY['admin', 'account_manager', 'developer', 'viewer']
    AND array_length(v_roles, 1) = 4,
    format('A7 all roles: expected 4 roles, got %s', v_roles);
  RAISE NOTICE 'TEST A7 (all 4 roles) ✓';

  -- ==========================================================================
  -- PART B: RLS SELECT access
  -- (Switch to authenticated role to activate RLS policies)
  -- ==========================================================================

  -- Become the 'authenticated' role so RLS kicks in
  SET LOCAL ROLE authenticated;

  -- TEST B1: Developer+Viewer CAN select Bleachers (via viewer)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev_viewer)::text, true);
  SELECT count(*) INTO v_count FROM public."Bleachers";
  ASSERT v_count > 0,
    format('B1 dev+viewer select Bleachers: expected >0, got %s', v_count);
  RAISE NOTICE 'TEST B1 (dev+viewer → Bleachers SELECT) ✓';

  -- TEST B2: Developer+Viewer CAN select RoadmapQuarters (via developer)
  SELECT count(*) INTO v_count FROM public."RoadmapQuarters";
  ASSERT v_count > 0,
    format('B2 dev+viewer select RoadmapQuarters: expected >0, got %s', v_count);
  RAISE NOTICE 'TEST B2 (dev+viewer → RoadmapQuarters SELECT) ✓';

  -- TEST B3: Viewer only CAN select Bleachers
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  SELECT count(*) INTO v_count FROM public."Bleachers";
  ASSERT v_count > 0,
    format('B3 viewer select Bleachers: expected >0, got %s', v_count);
  RAISE NOTICE 'TEST B3 (viewer → Bleachers SELECT) ✓';

  -- TEST B4: Viewer only CANNOT select RoadmapQuarters
  SELECT count(*) INTO v_count FROM public."RoadmapQuarters";
  ASSERT v_count = 0,
    format('B4 viewer select RoadmapQuarters: expected 0, got %s', v_count);
  RAISE NOTICE 'TEST B4 (viewer → RoadmapQuarters blocked) ✓';

  -- TEST B5: Developer only CANNOT select Bleachers
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev)::text, true);
  SELECT count(*) INTO v_count FROM public."Bleachers";
  ASSERT v_count = 0,
    format('B5 developer select Bleachers: expected 0, got %s', v_count);
  RAISE NOTICE 'TEST B5 (developer → Bleachers blocked) ✓';

  -- TEST B6: Developer only CAN select RoadmapQuarters
  SELECT count(*) INTO v_count FROM public."RoadmapQuarters";
  ASSERT v_count > 0,
    format('B6 developer select RoadmapQuarters: expected >0, got %s', v_count);
  RAISE NOTICE 'TEST B6 (developer → RoadmapQuarters SELECT) ✓';

  -- TEST B7: No roles CANNOT select anything
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_no_roles)::text, true);
  SELECT count(*) INTO v_count FROM public."Bleachers";
  ASSERT v_count = 0,
    format('B7 no-roles select Bleachers: expected 0, got %s', v_count);
  SELECT count(*) INTO v_count FROM public."RoadmapQuarters";
  ASSERT v_count = 0,
    format('B7 no-roles select RoadmapQuarters: expected 0, got %s', v_count);
  RAISE NOTICE 'TEST B7 (no roles → everything blocked) ✓';

  -- TEST B8: Admin CAN select everything
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  SELECT count(*) INTO v_count FROM public."Bleachers";
  ASSERT v_count > 0,
    format('B8 admin select Bleachers: expected >0, got %s', v_count);
  SELECT count(*) INTO v_count FROM public."RoadmapQuarters";
  ASSERT v_count > 0,
    format('B8 admin select RoadmapQuarters: expected >0, got %s', v_count);
  RAISE NOTICE 'TEST B8 (admin → SELECT everything) ✓';

  -- ==========================================================================
  -- PART C: Viewer is read-only (cannot INSERT/UPDATE/DELETE)
  -- ==========================================================================

  -- TEST C1: Viewer CANNOT insert into Bleachers
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  BEGIN
    INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
    VALUES (7777, 3, 30);
    ASSERT false, 'C1 viewer insert Bleachers should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST C1 (viewer → Bleachers INSERT blocked) ✓';
  END;

  -- TEST C2: Viewer CANNOT delete from Bleachers
  BEGIN
    DELETE FROM public."Bleachers";

    GET DIAGNOSTICS v_count = ROW_COUNT;

    ASSERT v_count = 0,
      format('C2 viewer delete Bleachers: expected 0 deleted rows, got %s', v_count);

    RAISE NOTICE 'TEST C2 (viewer → Bleachers DELETE blocked) ✓';
  END;

  -- TEST C3: Developer+Viewer CANNOT insert into Bleachers (viewer is read-only, developer has no Bleachers access)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev_viewer)::text, true);
  BEGIN
    INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
    VALUES (6666, 2, 20);
    ASSERT false, 'C3 dev+viewer insert Bleachers should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST C3 (dev+viewer → Bleachers INSERT blocked) ✓';
  END;

  -- TEST C4: Developer CAN insert into RoadmapQuarters
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev)::text, true);
  INSERT INTO public."RoadmapQuarters" (quarter, year) VALUES (2, 2999);
  RAISE NOTICE 'TEST C4 (developer → RoadmapQuarters INSERT allowed) ✓';

  -- TEST C5: Account manager CAN insert into Bleachers
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (8888, 5, 50);
  RAISE NOTICE 'TEST C5 (account_manager → Bleachers INSERT allowed) ✓';

  -- Switch back to postgres role
  RESET ROLE;

  RAISE NOTICE '--- all multi-role RLS tests passed ---';
END;
$$;

ROLLBACK;
