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
SET search_path TO extensions, public, "$user";
SELECT plan(1);


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
  v_total_users INTEGER;
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

  -- Count total users (seed + test users) for assertions later
  SELECT count(*) INTO v_total_users FROM public."Users";

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

  -- TEST C5: Account manager CANNOT insert into Bleachers (admin only)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  BEGIN
    INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
    VALUES (8888, 5, 50);
    ASSERT false, 'C5 AM insert Bleachers should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST C5 (account_manager → Bleachers INSERT blocked) ✓';
  END;

  -- ==========================================================================
  -- PART D: Users table — AM can see all users and insert
  -- ==========================================================================

  -- TEST D1: AM can see themselves
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  SELECT count(*) INTO v_count FROM public."Users"
    WHERE clerk_user_id = clerk_am;
  ASSERT v_count = 1,
    format('D1 AM see self: expected 1, got %s', v_count);
  RAISE NOTICE 'TEST D1 (AM → Users SELECT self) ✓';

  -- TEST D2: AM can see ALL users (seed + test users)
  SELECT count(*) INTO v_count FROM public."Users";
  ASSERT v_count = v_total_users,
    format('D2 AM see all users: expected %s, got %s', v_total_users, v_count);
  RAISE NOTICE 'TEST D2 (AM → Users SELECT all: % users) ✓', v_count;

  -- TEST D3: AM can INSERT into Users (create new team members)
  INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
  VALUES ('New', 'Driver', 'newdriver@test.com', 'clerk_new_driver', false, false);
  RAISE NOTICE 'TEST D3 (AM → Users INSERT allowed) ✓';

  -- TEST D4: AM CANNOT update other users (only self)
  BEGIN
    UPDATE public."Users" SET first_name = 'Hacked'
      WHERE id = user_admin;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('D4 AM update admin: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST D4 (AM → Users UPDATE other blocked) ✓';
  END;

  -- TEST D5: AM CAN update own record
  UPDATE public."Users" SET first_name = 'AM Updated'
    WHERE clerk_user_id = clerk_am;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1,
    format('D5 AM update self: expected 1, got %s', v_count);
  RAISE NOTICE 'TEST D5 (AM → Users UPDATE self allowed) ✓';

  -- TEST D6: Viewer can only see themselves
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  SELECT count(*) INTO v_count FROM public."Users";
  ASSERT v_count = 1,
    format('D6 viewer Users: expected 1 (self), got %s', v_count);
  RAISE NOTICE 'TEST D6 (viewer → Users SELECT only self) ✓';

  -- TEST D7: No-roles user can only see themselves
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_no_roles)::text, true);
  SELECT count(*) INTO v_count FROM public."Users";
  ASSERT v_count = 1,
    format('D7 no-roles Users: expected 1 (self), got %s', v_count);
  RAISE NOTICE 'TEST D7 (no-roles → Users SELECT only self) ✓';

  -- ==========================================================================
  -- PART E: Bleachers — admin-only write, all roles can read
  -- ==========================================================================

  -- TEST E1: Admin CAN insert into Bleachers
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
  INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (8888, 5, 50);
  RAISE NOTICE 'TEST E1 (admin → Bleachers INSERT allowed) ✓';

  -- TEST E2: Admin CAN update Bleachers
  UPDATE public."Bleachers" SET bleacher_seats = 55 WHERE bleacher_number = 8888;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1,
    format('E2 admin update Bleachers: expected 1, got %s', v_count);
  RAISE NOTICE 'TEST E2 (admin → Bleachers UPDATE allowed) ✓';

  -- TEST E3: AM CANNOT update Bleachers
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  UPDATE public."Bleachers" SET bleacher_seats = 99 WHERE bleacher_number = 8888;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0,
    format('E3 AM update Bleachers: expected 0, got %s', v_count);
  RAISE NOTICE 'TEST E3 (AM → Bleachers UPDATE blocked) ✓';

  -- TEST E4: AM CAN select Bleachers
  SELECT count(*) INTO v_count FROM public."Bleachers";
  ASSERT v_count > 0,
    format('E4 AM select Bleachers: expected >0, got %s', v_count);
  RAISE NOTICE 'TEST E4 (AM → Bleachers SELECT allowed) ✓';

  -- TEST E5: Viewer CAN select Bleachers
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  SELECT count(*) INTO v_count FROM public."Bleachers";
  ASSERT v_count > 0,
    format('E5 viewer select Bleachers: expected >0, got %s', v_count);
  RAISE NOTICE 'TEST E5 (viewer → Bleachers SELECT allowed) ✓';

  -- TEST E6: Viewer CANNOT update Bleachers
  UPDATE public."Bleachers" SET bleacher_seats = 99 WHERE bleacher_number = 8888;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0,
    format('E6 viewer update Bleachers: expected 0, got %s', v_count);
  RAISE NOTICE 'TEST E6 (viewer → Bleachers UPDATE blocked) ✓';

  -- ==========================================================================
  -- PART F: Drivers — AM ownership-based UPDATE
  -- ==========================================================================

  -- Setup: create drivers with different AM assignments
  -- Need to switch to postgres to insert without RLS
  RESET ROLE;

  DECLARE
    am_id            UUID;
    driver_own       UUID;
    driver_unassigned UUID;
    driver_other_am  UUID;
    other_am_id      UUID;
  BEGIN
    -- Get AM's AccountManagers.id
    SELECT am.id INTO am_id FROM public."AccountManagers" am
      WHERE am.user_uuid = user_am AND am.is_active = true;

    -- Create a second AM for "other AM" tests
    -- (user_admin_all already has an AM record)
    SELECT am.id INTO other_am_id FROM public."AccountManagers" am
      WHERE am.user_uuid = user_admin_all AND am.is_active = true;

    -- Driver assigned to our AM
    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
    VALUES ('OwnDriver', 'Test', 'owndriver@test.com', 'clerk_own_driver', false, false)
    RETURNING id INTO driver_own;
    INSERT INTO public."Drivers" (user_uuid, is_active, account_manager_uuid)
    VALUES (driver_own, true, am_id)
    RETURNING id INTO driver_own;

    -- Unassigned driver
    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
    VALUES ('Unassigned', 'Driver', 'unassigned@test.com', 'clerk_unassigned_driver', false, false)
    RETURNING id INTO driver_unassigned;
    INSERT INTO public."Drivers" (user_uuid, is_active, account_manager_uuid)
    VALUES (driver_unassigned, true, NULL)
    RETURNING id INTO driver_unassigned;

    -- Driver assigned to other AM
    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
    VALUES ('OtherAM', 'Driver', 'otherdriver@test.com', 'clerk_other_driver', false, false)
    RETURNING id INTO driver_other_am;
    INSERT INTO public."Drivers" (user_uuid, is_active, account_manager_uuid)
    VALUES (driver_other_am, true, other_am_id)
    RETURNING id INTO driver_other_am;

    -- Switch to authenticated role for RLS tests
    SET LOCAL ROLE authenticated;

    -- TEST F1: AM CAN update own driver
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
    UPDATE public."Drivers" SET tax = 10 WHERE id = driver_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('F1 AM update own driver: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST F1 (AM → own driver UPDATE allowed) ✓';

    -- TEST F2: AM CAN update unassigned driver (assign to self)
    UPDATE public."Drivers" SET account_manager_uuid = am_id WHERE id = driver_unassigned;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('F2 AM assign unassigned driver: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST F2 (AM → unassigned driver assign to self) ✓';

    -- TEST F3: AM CAN unassign own driver (set to null)
    UPDATE public."Drivers" SET account_manager_uuid = NULL WHERE id = driver_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('F3 AM unassign own driver: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST F3 (AM → own driver unassign) ✓';

    -- TEST F4: AM CANNOT update other AM's driver
    UPDATE public."Drivers" SET tax = 99 WHERE id = driver_other_am;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('F4 AM update other AM driver: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST F4 (AM → other AM driver UPDATE blocked) ✓';

    -- TEST F5: AM CANNOT assign driver to other AM (WITH CHECK blocks it)
    -- driver_own was unassigned in F3, re-assign to self first
    UPDATE public."Drivers" SET account_manager_uuid = am_id WHERE id = driver_own;
    -- Now try to assign own driver to other AM
    BEGIN
      UPDATE public."Drivers" SET account_manager_uuid = other_am_id WHERE id = driver_own;
      ASSERT false, 'F5 AM assign to other AM should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST F5 (AM → assign driver to other AM blocked) ✓';
    END;

    -- TEST F6: AM CAN select all drivers
    SELECT count(*) INTO v_count FROM public."Drivers";
    ASSERT v_count >= 3,
      format('F6 AM select drivers: expected >=3, got %s', v_count);
    RAISE NOTICE 'TEST F6 (AM → Drivers SELECT all) ✓';

    -- TEST F7: Admin CAN update any driver
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
    UPDATE public."Drivers" SET tax = 15 WHERE id = driver_other_am;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('F7 admin update any driver: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST F7 (admin → any driver UPDATE allowed) ✓';
  END;

  -- Switch back to postgres role
  RESET ROLE;

  RAISE NOTICE '--- all multi-role RLS tests passed ---';
END;
$$;

SELECT ok(true, 'all assertions passed');
SELECT * FROM finish();

ROLLBACK;
