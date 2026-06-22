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

  -- TEST C4: Developer CANNOT insert into RoadmapQuarters (admin CRUD, developer read-only)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev)::text, true);
  BEGIN
    INSERT INTO public."RoadmapQuarters" (quarter, year) VALUES (2, 2999);
    ASSERT false, 'C4 developer insert RoadmapQuarters should have failed';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'TEST C4 (developer → RoadmapQuarters INSERT blocked) ✓';
  END;

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

  -- TEST D6: Viewer can see all users (needed for team page, event owner names, driver display)
  -- v_total_users was captured before D3 inserted 1 extra user, so expect v_total_users + 1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
  SELECT count(*) INTO v_count FROM public."Users";
  ASSERT v_count = v_total_users + 1,
    format('D6 viewer Users: expected %s (all), got %s', v_total_users + 1, v_count);
  RAISE NOTICE 'TEST D6 (viewer → Users SELECT all) ✓';

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

  -- TEST E3: AM CAN update Bleachers (policy allows admin + account_manager)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
  UPDATE public."Bleachers" SET bleacher_seats = 99 WHERE bleacher_number = 8888;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1,
    format('E3 AM update Bleachers: expected 1, got %s', v_count);
  RAISE NOTICE 'TEST E3 (AM → Bleachers UPDATE allowed) ✓';

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

  -- ==========================================================================
  -- PART G: Events — AM ownership-based write, admin full access
  -- ==========================================================================
  DECLARE
    am_id_g          UUID;
    other_am_user    UUID;  -- a second AM's Users.id
    event_own        UUID;  -- event created by user_am
    event_other      UUID;  -- event created by other AM
  BEGIN
    -- Get AM's AccountManagers.id
    SELECT am.id INTO am_id_g FROM public."AccountManagers" am
      WHERE am.user_uuid = user_am AND am.is_active = true;

    -- Create events as postgres (bypass RLS)
    INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
    VALUES ('AM Own Event', '2026-07-01', '2026-07-01', false, false, user_am)
    RETURNING id INTO event_own;

    INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
    VALUES ('Other AM Event', '2026-07-02', '2026-07-02', false, false, user_admin_all)
    RETURNING id INTO event_other;

    -- Switch to authenticated role for RLS tests
    SET LOCAL ROLE authenticated;

    -- TEST G1: AM CAN select all events
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
    SELECT count(*) INTO v_count FROM public."Events";
    ASSERT v_count >= 2,
      format('G1 AM select events: expected >=2, got %s', v_count);
    RAISE NOTICE 'TEST G1 (AM → Events SELECT all) ✓';

    -- TEST G2: AM CAN insert event with self as owner
    INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
    VALUES ('AM New Event', '2026-08-01', '2026-08-01', false, false, user_am);
    RAISE NOTICE 'TEST G2 (AM → Events INSERT own) ✓';

    -- TEST G3: AM CAN insert event with other user as owner (RLS relaxed to allow AM full CRUD)
    INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
    VALUES ('Fake Event', '2026-09-01', '2026-09-01', false, false, user_admin);
    RAISE NOTICE 'TEST G3 (AM → Events INSERT for other allowed) ✓';

    -- TEST G4: AM CAN update own event
    UPDATE public."Events" SET event_name = 'Updated Own Event' WHERE id = event_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('G4 AM update own event: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST G4 (AM → Events UPDATE own) ✓';

    -- TEST G5: AM CAN update other's event (RLS relaxed to allow AM full CRUD)
    UPDATE public."Events" SET event_name = 'Hacked' WHERE id = event_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('G5 AM update other event: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST G5 (AM → Events UPDATE other allowed) ✓';

    -- TEST G6: AM CAN delete own event
    -- (create a throwaway event to delete)
    DECLARE
      event_to_delete UUID;
    BEGIN
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
      VALUES ('To Delete', '2026-10-01', '2026-10-01', false, false, user_am)
      RETURNING id INTO event_to_delete;

      DELETE FROM public."Events" WHERE id = event_to_delete;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('G6 AM delete own event: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST G6 (AM → Events DELETE own) ✓';
    END;

    -- TEST G7: AM CAN delete other's event (RLS relaxed to allow AM full CRUD)
    -- Create a separate event for G7 so we don't delete the one used in G8
    DECLARE
      event_to_delete_other UUID;
    BEGIN
      RESET ROLE;
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
      VALUES ('Delete Other', '2026-10-15', '2026-10-15', false, false, user_admin)
      RETURNING id INTO event_to_delete_other;
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

      DELETE FROM public."Events" WHERE id = event_to_delete_other;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('G7 AM delete other event: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST G7 (AM → Events DELETE other allowed) ✓';
    END;

    -- TEST G8: Admin CAN update any event
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
    UPDATE public."Events" SET event_name = 'Admin Updated' WHERE id = event_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('G8 admin update any event: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST G8 (admin → Events UPDATE any) ✓';

    -- TEST G9: Admin CAN delete any event
    DECLARE
      event_admin_del UUID;
    BEGIN
      RESET ROLE;
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
      VALUES ('Admin Del', '2026-11-01', '2026-11-01', false, false, user_admin)
      RETURNING id INTO event_admin_del;
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

      DELETE FROM public."Events" WHERE id = event_admin_del;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('G9 admin delete event: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST G9 (admin → Events DELETE any) ✓';
    END;

    -- TEST G10: Viewer CAN select events
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
    SELECT count(*) INTO v_count FROM public."Events";
    ASSERT v_count > 0,
      format('G10 viewer select events: expected >0, got %s', v_count);
    RAISE NOTICE 'TEST G10 (viewer → Events SELECT) ✓';

    -- TEST G11: Viewer CANNOT insert events
    BEGIN
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
      VALUES ('Viewer Event', '2026-12-01', '2026-12-01', false, false, user_viewer);
      ASSERT false, 'G11 viewer insert event should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST G11 (viewer → Events INSERT blocked) ✓';
    END;

    -- ==========================================================================
    -- PART H: BleacherEvents — AM owns event + bleacher, admin full access
    -- ==========================================================================

    RESET ROLE;

    -- Setup bleachers: one assigned to AM, one assigned to other AM, one unassigned
    DECLARE
      bleacher_own      UUID;
      bleacher_other    UUID;
      bleacher_none     UUID;
      be_id             UUID;
    BEGIN
      INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats,
        summer_account_manager_uuid, winter_account_manager_uuid)
      VALUES (7001, 10, 100, am_id_g, am_id_g)
      RETURNING id INTO bleacher_own;

      -- Get other AM id
      DECLARE
        other_am_id_h UUID;
      BEGIN
        SELECT am.id INTO other_am_id_h FROM public."AccountManagers" am
          WHERE am.user_uuid = user_admin_all AND am.is_active = true;

        INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats,
          summer_account_manager_uuid, winter_account_manager_uuid)
        VALUES (7002, 10, 100, other_am_id_h, other_am_id_h)
        RETURNING id INTO bleacher_other;

        INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats,
          summer_account_manager_uuid, winter_account_manager_uuid)
        VALUES (7003, 10, 100, NULL, NULL)
        RETURNING id INTO bleacher_none;

        SET LOCAL ROLE authenticated;

        -- TEST H1: AM CAN insert BleacherEvent for own event + own bleacher
        PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
        INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
        VALUES (event_own, bleacher_own)
        RETURNING id INTO be_id;
        RAISE NOTICE 'TEST H1 (AM → BleacherEvents INSERT own event + own bleacher) ✓';

        -- TEST H2: AM CAN insert BleacherEvent for other's event (RLS relaxed to allow AM full CRUD)
        INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
        VALUES (event_other, bleacher_own);
        RAISE NOTICE 'TEST H2 (AM → BleacherEvents INSERT other event allowed) ✓';

        -- TEST H3: AM CAN insert BleacherEvent for own event + other's bleacher (RLS relaxed)
        INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
        VALUES (event_own, bleacher_other);
        RAISE NOTICE 'TEST H3 (AM → BleacherEvents INSERT other bleacher allowed) ✓';

        -- TEST H4: AM CAN insert BleacherEvent for own event + unassigned bleacher (RLS relaxed)
        INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
        VALUES (event_own, bleacher_none);
        RAISE NOTICE 'TEST H4 (AM → BleacherEvents INSERT unassigned bleacher allowed) ✓';

        -- TEST H5: AM CAN update BleacherEvent for own event + own bleacher
        UPDATE public."BleacherEvents" SET setup_confirmed = true WHERE id = be_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        ASSERT v_count = 1,
          format('H5 AM update own BE: expected 1, got %s', v_count);
        RAISE NOTICE 'TEST H5 (AM → BleacherEvents UPDATE own) ✓';

        -- TEST H6: AM CAN delete BleacherEvent from own event
        DELETE FROM public."BleacherEvents" WHERE id = be_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        ASSERT v_count = 1,
          format('H6 AM delete own BE: expected 1, got %s', v_count);
        RAISE NOTICE 'TEST H6 (AM → BleacherEvents DELETE own event) ✓';

        -- TEST H7: AM CAN delete BleacherEvent from other's event (RLS relaxed to allow AM full CRUD)
        RESET ROLE;
        DECLARE
          be_other UUID;
        BEGIN
          INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
          VALUES (event_other, bleacher_other)
          RETURNING id INTO be_other;

          SET LOCAL ROLE authenticated;
          PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

          DELETE FROM public."BleacherEvents" WHERE id = be_other;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          ASSERT v_count = 1,
            format('H7 AM delete other BE: expected 1, got %s', v_count);
          RAISE NOTICE 'TEST H7 (AM → BleacherEvents DELETE other event allowed) ✓';

          -- TEST H8: Admin CAN insert BleacherEvent for any event + any bleacher
          PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
          INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
          VALUES (event_own, bleacher_other);
          RAISE NOTICE 'TEST H8 (admin → BleacherEvents INSERT any) ✓';

          -- TEST H9: Admin CAN delete any BleacherEvent
          -- Create a separate BE for admin to delete
          DECLARE
            be_admin_del UUID;
          BEGIN
            RESET ROLE;
            INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
            VALUES (event_own, bleacher_none)
            RETURNING id INTO be_admin_del;
            SET LOCAL ROLE authenticated;
            PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

            DELETE FROM public."BleacherEvents" WHERE id = be_admin_del;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            ASSERT v_count = 1,
              format('H9 admin delete any BE: expected 1, got %s', v_count);
            RAISE NOTICE 'TEST H9 (admin → BleacherEvents DELETE any) ✓';
          END;

          -- TEST H10: Viewer CAN select BleacherEvents
          PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
          SELECT count(*) INTO v_count FROM public."BleacherEvents";
          ASSERT v_count > 0,
            format('H10 viewer select BleacherEvents: expected >0, got %s', v_count);
          RAISE NOTICE 'TEST H10 (viewer → BleacherEvents SELECT) ✓';

          -- TEST H11: Viewer CANNOT insert BleacherEvents
          BEGIN
            INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
            VALUES (event_own, bleacher_own);
            ASSERT false, 'H11 viewer insert BE should have failed';
          EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'TEST H11 (viewer → BleacherEvents INSERT blocked) ✓';
          END;
        END;
      END;
    END;
  END;

  RESET ROLE;

  -- ==========================================================================
  -- PART I: WorkTrackers — AM ownership + driver + bleacher restrictions
  -- ==========================================================================
  DECLARE
    am_id_i          UUID;
    other_am_id_i    UUID;
    driver_own_i     UUID;   -- Drivers.id assigned to AM
    driver_other_i   UUID;   -- Drivers.id assigned to other AM
    bleacher_own_i   UUID;   -- Bleacher assigned to AM
    bleacher_other_i UUID;   -- Bleacher assigned to other AM
    wt_own           UUID;   -- WorkTracker created by AM with own driver + own bleacher
    wt_other         UUID;   -- WorkTracker with other AM's driver + other bleacher
    wt_no_driver     UUID;   -- WorkTracker with no driver, created by AM, own bleacher
    wt_to_delete     UUID;
  BEGIN
    -- Get AM's AccountManagers.id
    SELECT am.id INTO am_id_i FROM public."AccountManagers" am
      WHERE am.user_uuid = user_am AND am.is_active = true;

    -- Get other AM's AccountManagers.id
    SELECT am.id INTO other_am_id_i FROM public."AccountManagers" am
      WHERE am.user_uuid = user_admin_all AND am.is_active = true;

    -- Create drivers for this test part
    DECLARE
      driver_user_own   UUID;
      driver_user_other UUID;
    BEGIN
      INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
      VALUES ('WTOwnDriver', 'Test', 'wtowndriver@test.com', 'clerk_wt_own_driver', false, false)
      RETURNING id INTO driver_user_own;
      INSERT INTO public."Drivers" (user_uuid, is_active, account_manager_uuid)
      VALUES (driver_user_own, true, am_id_i)
      RETURNING id INTO driver_own_i;

      INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer)
      VALUES ('WTOtherDriver', 'Test', 'wtotherdriver@test.com', 'clerk_wt_other_driver', false, false)
      RETURNING id INTO driver_user_other;
      INSERT INTO public."Drivers" (user_uuid, is_active, account_manager_uuid)
      VALUES (driver_user_other, true, other_am_id_i)
      RETURNING id INTO driver_other_i;
    END;

    -- Create bleachers: one assigned to AM, one to other AM
    INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats,
      summer_account_manager_uuid, winter_account_manager_uuid)
    VALUES (8001, 10, 100, am_id_i, am_id_i)
    RETURNING id INTO bleacher_own_i;

    INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats,
      summer_account_manager_uuid, winter_account_manager_uuid)
    VALUES (8002, 10, 100, other_am_id_i, other_am_id_i)
    RETURNING id INTO bleacher_other_i;

    -- Create test WorkTrackers as postgres (bypass RLS)
    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-07-01', user_am, driver_own_i, bleacher_own_i)
    RETURNING id INTO wt_own;

    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-07-02', user_admin_all, driver_other_i, bleacher_other_i)
    RETURNING id INTO wt_other;

    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-07-03', user_am, NULL, bleacher_own_i)
    RETURNING id INTO wt_no_driver;

    -- Switch to authenticated role for RLS tests
    SET LOCAL ROLE authenticated;

    -- TEST I1: AM CAN select all work trackers
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
    SELECT count(*) INTO v_count FROM public."WorkTrackers";
    ASSERT v_count >= 3,
      format('I1 AM select WorkTrackers: expected >=3, got %s', v_count);
    RAISE NOTICE 'TEST I1 (AM → WorkTrackers SELECT all) ✓';

    -- TEST I2: AM CAN insert WorkTracker with own bleacher + own driver
    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-08-01', user_am, driver_own_i, bleacher_own_i);
    RAISE NOTICE 'TEST I2 (AM → WorkTrackers INSERT own bleacher + own driver) ✓';

    -- TEST I3: AM CAN insert WorkTracker with own bleacher + no driver
    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-08-02', user_am, NULL, bleacher_own_i);
    RAISE NOTICE 'TEST I3 (AM → WorkTrackers INSERT own bleacher + no driver) ✓';

    -- TEST I4: AM CAN insert WorkTracker with other user as created_by (on own bleacher)
    -- Policy only checks bleacher ownership, not created_by_user_uuid.
    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-08-03', user_admin, driver_own_i, bleacher_own_i);
    RAISE NOTICE 'TEST I4 (AM → WorkTrackers INSERT other created_by on own bleacher) ✓';

    -- TEST I5: AM CAN insert WorkTracker with other AM's driver (on own bleacher)
    -- Policy only checks bleacher ownership, not driver ownership.
    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-08-04', user_am, driver_other_i, bleacher_own_i);
    RAISE NOTICE 'TEST I5 (AM → WorkTrackers INSERT other driver on own bleacher) ✓';

    -- TEST I6: AM CAN insert WorkTracker with other AM's bleacher (role-only RLS)
    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-08-05', user_am, driver_own_i, bleacher_other_i);
    RAISE NOTICE 'TEST I6 (AM → WorkTrackers INSERT other AM bleacher) ✓';

    -- TEST I7: AM CAN update own WorkTracker (created_by = self)
    UPDATE public."WorkTrackers" SET notes = 'Updated' WHERE id = wt_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('I7 AM update own WT: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST I7 (AM → WorkTrackers UPDATE own) ✓';

    -- TEST I8: AM CAN update WorkTracker with no driver but created_by = self
    UPDATE public."WorkTrackers" SET notes = 'Updated no driver' WHERE id = wt_no_driver;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('I8 AM update WT no driver (created_by self): expected 1, got %s', v_count);
    RAISE NOTICE 'TEST I8 (AM → WorkTrackers UPDATE no-driver own) ✓';

    -- TEST I9: AM CAN update other AM's WorkTracker (role-only RLS)
    UPDATE public."WorkTrackers" SET notes = 'Hacked' WHERE id = wt_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('I9 AM update other WT: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST I9 (AM → WorkTrackers UPDATE other) ✓';

    -- TEST I10: AM CAN update own WT to use other AM's bleacher (role-only RLS)
    UPDATE public."WorkTrackers" SET bleacher_uuid = bleacher_other_i WHERE id = wt_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('I10 AM update WT bleacher to other: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST I10 (AM → WorkTrackers UPDATE bleacher to other) ✓';

    -- TEST I11: AM CAN update own WT to use other AM's driver (policy only checks bleacher)
    UPDATE public."WorkTrackers" SET driver_uuid = driver_other_i WHERE id = wt_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('I11 AM update WT driver to other: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST I11 (AM → WorkTrackers UPDATE driver to other on own bleacher) ✓';
    -- Restore original driver for subsequent tests
    UPDATE public."WorkTrackers" SET driver_uuid = driver_own_i WHERE id = wt_own;

    -- TEST I11b: AM CAN update WT created by admin but with AM's driver (USING allows via driver)
    RESET ROLE;
    DECLARE
      wt_admin_am_driver UUID;
    BEGIN
      INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
      VALUES ('2026-08-20', user_admin, driver_own_i, bleacher_own_i)
      RETURNING id INTO wt_admin_am_driver;
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

      UPDATE public."WorkTrackers" SET notes = 'AM updated admin WT' WHERE id = wt_admin_am_driver;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('I11b AM update admin WT with own driver: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST I11b (AM → WorkTrackers UPDATE admin-created with own driver) ✓';
    END;

    -- TEST I12: AM CAN delete own WorkTracker
    RESET ROLE;
    INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
    VALUES ('2026-09-01', user_am, driver_own_i, bleacher_own_i)
    RETURNING id INTO wt_to_delete;
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

    DELETE FROM public."WorkTrackers" WHERE id = wt_to_delete;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('I12 AM delete own WT: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST I12 (AM → WorkTrackers DELETE own) ✓';

    -- TEST I13: AM CAN delete other AM's WorkTracker (role-only RLS)
    RESET ROLE;
    DECLARE
      wt_other_del UUID;
    BEGIN
      INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
      VALUES ('2026-09-02', user_admin_all, driver_other_i, bleacher_other_i)
      RETURNING id INTO wt_other_del;
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

      DELETE FROM public."WorkTrackers" WHERE id = wt_other_del;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('I13 AM delete other WT: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST I13 (AM → WorkTrackers DELETE other) ✓';
    END;

    -- TEST I14: Admin CAN update any WorkTracker
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
    UPDATE public."WorkTrackers" SET notes = 'Admin updated' WHERE id = wt_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('I14 admin update any WT: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST I14 (admin → WorkTrackers UPDATE any) ✓';

    -- TEST I15: Admin CAN delete any WorkTracker
    RESET ROLE;
    DECLARE
      wt_admin_del UUID;
    BEGIN
      INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid)
      VALUES ('2026-10-01', user_admin, NULL)
      RETURNING id INTO wt_admin_del;
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

      DELETE FROM public."WorkTrackers" WHERE id = wt_admin_del;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('I15 admin delete any WT: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST I15 (admin → WorkTrackers DELETE any) ✓';
    END;

    -- TEST I16: Viewer CAN select WorkTrackers
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
    SELECT count(*) INTO v_count FROM public."WorkTrackers";
    ASSERT v_count > 0,
      format('I16 viewer select WorkTrackers: expected >0, got %s', v_count);
    RAISE NOTICE 'TEST I16 (viewer → WorkTrackers SELECT) ✓';

    -- TEST I17: Viewer CANNOT insert WorkTrackers
    BEGIN
      INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
      VALUES ('2026-11-01', user_viewer, NULL, bleacher_own_i);
      ASSERT false, 'I17 viewer insert WT should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST I17 (viewer → WorkTrackers INSERT blocked) ✓';
    END;
  END;

  RESET ROLE;

  -- ==========================================================================
  -- PART J: MaintenanceEvents — AM ownership-based write, admin full access
  -- ==========================================================================
  DECLARE
    me_own           UUID;   -- MaintenanceEvent created by AM
    me_other         UUID;   -- MaintenanceEvent created by other AM
  BEGIN
    -- Create test MaintenanceEvents as postgres (bypass RLS)
    INSERT INTO public."MaintenanceEvents" (event_name, event_start, event_end, created_by_user_uuid)
    VALUES ('AM Own Maint', '2026-07-01', '2026-07-10', user_am)
    RETURNING id INTO me_own;

    INSERT INTO public."MaintenanceEvents" (event_name, event_start, event_end, created_by_user_uuid)
    VALUES ('Other AM Maint', '2026-07-02', '2026-07-11', user_admin_all)
    RETURNING id INTO me_other;

    SET LOCAL ROLE authenticated;

    -- TEST J1: AM CAN select all maintenance events
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
    SELECT count(*) INTO v_count FROM public."MaintenanceEvents";
    ASSERT v_count >= 2,
      format('J1 AM select MaintenanceEvents: expected >=2, got %s', v_count);
    RAISE NOTICE 'TEST J1 (AM → MaintenanceEvents SELECT all) ✓';

    -- TEST J2: AM CAN insert own maintenance event
    INSERT INTO public."MaintenanceEvents" (event_name, event_start, event_end, created_by_user_uuid)
    VALUES ('AM New Maint', '2026-08-01', '2026-08-10', user_am);
    RAISE NOTICE 'TEST J2 (AM → MaintenanceEvents INSERT own) ✓';

    -- TEST J3: AM CAN insert maintenance event for other user (role-only RLS)
    INSERT INTO public."MaintenanceEvents" (event_name, event_start, event_end, created_by_user_uuid)
    VALUES ('Fake Maint', '2026-09-01', '2026-09-10', user_admin);
    RAISE NOTICE 'TEST J3 (AM → MaintenanceEvents INSERT for other) ✓';

    -- TEST J4: AM CAN update own maintenance event
    UPDATE public."MaintenanceEvents" SET event_name = 'Updated Maint' WHERE id = me_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('J4 AM update own maint: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST J4 (AM → MaintenanceEvents UPDATE own) ✓';

    -- TEST J5: AM CAN update other's maintenance event (role-only RLS)
    UPDATE public."MaintenanceEvents" SET event_name = 'Hacked' WHERE id = me_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('J5 AM update other maint: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST J5 (AM → MaintenanceEvents UPDATE other) ✓';

    -- TEST J6: AM CAN delete own maintenance event
    RESET ROLE;
    DECLARE
      me_to_delete UUID;
    BEGIN
      INSERT INTO public."MaintenanceEvents" (event_name, event_start, event_end, created_by_user_uuid)
      VALUES ('To Delete Maint', '2026-10-01', '2026-10-10', user_am)
      RETURNING id INTO me_to_delete;
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

      DELETE FROM public."MaintenanceEvents" WHERE id = me_to_delete;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('J6 AM delete own maint: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST J6 (AM → MaintenanceEvents DELETE own) ✓';
    END;

    -- TEST J7: AM CAN delete other's maintenance event (role-only RLS)
    RESET ROLE;
    DECLARE
      me_other_del UUID;
    BEGIN
      INSERT INTO public."MaintenanceEvents" (event_name, event_start, event_end, created_by_user_uuid)
      VALUES ('Other Del Maint', '2026-10-15', '2026-10-20', user_admin_all)
      RETURNING id INTO me_other_del;
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

      DELETE FROM public."MaintenanceEvents" WHERE id = me_other_del;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('J7 AM delete other maint: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST J7 (AM → MaintenanceEvents DELETE other) ✓';
    END;

    -- TEST J8: Admin CAN update any maintenance event
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
    UPDATE public."MaintenanceEvents" SET event_name = 'Admin Updated' WHERE id = me_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('J8 admin update any maint: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST J8 (admin → MaintenanceEvents UPDATE any) ✓';

    -- TEST J9: Viewer CAN select maintenance events
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
    SELECT count(*) INTO v_count FROM public."MaintenanceEvents";
    ASSERT v_count > 0,
      format('J9 viewer select MaintenanceEvents: expected >0, got %s', v_count);
    RAISE NOTICE 'TEST J9 (viewer → MaintenanceEvents SELECT) ✓';

    -- TEST J10: Viewer CANNOT insert maintenance events
    BEGIN
      INSERT INTO public."MaintenanceEvents" (event_name, event_start, event_end, created_by_user_uuid)
      VALUES ('Viewer Maint', '2026-12-01', '2026-12-10', user_viewer);
      ASSERT false, 'J10 viewer insert maint should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST J10 (viewer → MaintenanceEvents INSERT blocked) ✓';
    END;

    -- ==========================================================================
    -- PART K: BleacherMaintEvents — AM owns maint event + bleacher, admin full
    -- ==========================================================================

    RESET ROLE;

    DECLARE
      am_id_k          UUID;
      other_am_id_k    UUID;
      bleacher_own_k   UUID;
      bleacher_other_k UUID;
      bme_id           UUID;
    BEGIN
      SELECT am.id INTO am_id_k FROM public."AccountManagers" am
        WHERE am.user_uuid = user_am AND am.is_active = true;
      SELECT am.id INTO other_am_id_k FROM public."AccountManagers" am
        WHERE am.user_uuid = user_admin_all AND am.is_active = true;

      INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats,
        summer_account_manager_uuid, winter_account_manager_uuid)
      VALUES (9001, 10, 100, am_id_k, am_id_k)
      RETURNING id INTO bleacher_own_k;

      INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats,
        summer_account_manager_uuid, winter_account_manager_uuid)
      VALUES (9002, 10, 100, other_am_id_k, other_am_id_k)
      RETURNING id INTO bleacher_other_k;

      SET LOCAL ROLE authenticated;

      -- TEST K1: AM CAN insert BleacherMaintEvent with own event + own bleacher
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);
      INSERT INTO public."BleacherMaintEvents" (maintenance_event_uuid, bleacher_uuid)
      VALUES (me_own, bleacher_own_k)
      RETURNING id INTO bme_id;
      RAISE NOTICE 'TEST K1 (AM → BleacherMaintEvents INSERT own event + own bleacher) ✓';

      -- TEST K2: AM CAN insert BleacherMaintEvent with other's event (role-only RLS)
      INSERT INTO public."BleacherMaintEvents" (maintenance_event_uuid, bleacher_uuid)
      VALUES (me_other, bleacher_own_k);
      RAISE NOTICE 'TEST K2 (AM → BleacherMaintEvents INSERT other event) ✓';

      -- TEST K3: AM CAN insert BleacherMaintEvent with other's bleacher (role-only RLS)
      INSERT INTO public."BleacherMaintEvents" (maintenance_event_uuid, bleacher_uuid)
      VALUES (me_own, bleacher_other_k);
      RAISE NOTICE 'TEST K3 (AM → BleacherMaintEvents INSERT other bleacher) ✓';

      -- TEST K4: AM CAN delete BleacherMaintEvent from own event
      DELETE FROM public."BleacherMaintEvents" WHERE id = bme_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('K4 AM delete own BME: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST K4 (AM → BleacherMaintEvents DELETE own event) ✓';

      -- TEST K5: AM CAN delete BleacherMaintEvent from other's event (role-only RLS)
      RESET ROLE;
      DECLARE
        bme_other UUID;
      BEGIN
        INSERT INTO public."BleacherMaintEvents" (maintenance_event_uuid, bleacher_uuid)
        VALUES (me_other, bleacher_other_k)
        RETURNING id INTO bme_other;
        SET LOCAL ROLE authenticated;
        PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

        DELETE FROM public."BleacherMaintEvents" WHERE id = bme_other;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        ASSERT v_count = 1,
          format('K5 AM delete other BME: expected 1, got %s', v_count);
        RAISE NOTICE 'TEST K5 (AM → BleacherMaintEvents DELETE other event) ✓';
      END;

      -- TEST K6: Admin CAN insert BleacherMaintEvent for any event/bleacher
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
      INSERT INTO public."BleacherMaintEvents" (maintenance_event_uuid, bleacher_uuid)
      VALUES (me_other, bleacher_own_k);
      RAISE NOTICE 'TEST K6 (admin → BleacherMaintEvents INSERT any) ✓';

      -- TEST K7: Viewer CAN select BleacherMaintEvents
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
      SELECT count(*) INTO v_count FROM public."BleacherMaintEvents";
      ASSERT v_count > 0,
        format('K7 viewer select BME: expected >0, got %s', v_count);
      RAISE NOTICE 'TEST K7 (viewer → BleacherMaintEvents SELECT) ✓';

      -- TEST K8: Viewer CANNOT insert BleacherMaintEvents
      BEGIN
        INSERT INTO public."BleacherMaintEvents" (maintenance_event_uuid, bleacher_uuid)
        VALUES (me_own, bleacher_own_k);
        ASSERT false, 'K8 viewer insert BME should have failed';
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'TEST K8 (viewer → BleacherMaintEvents INSERT blocked) ✓';
      END;
    END;
  END;

  RESET ROLE;

  -- ==========================================================================
  -- PART L: Inactive User Lockout
  -- Users with status_uuid = '7b65d5a1-...' (inactive) should have NO access
  -- regardless of roles. Exception: can still read own Users row.
  -- ==========================================================================
  DECLARE
    inactive_status CONSTANT UUID := '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5';

    user_inactive_admin   UUID;
    user_inactive_am      UUID;
    user_inactive_dev     UUID;
    user_inactive_viewer  UUID;

    clerk_inactive_admin  TEXT := 'clerk_inactive_admin';
    clerk_inactive_am     TEXT := 'clerk_inactive_am';
    clerk_inactive_dev    TEXT := 'clerk_inactive_dev';
    clerk_inactive_viewer TEXT := 'clerk_inactive_viewer';
  BEGIN
    -- Ensure the "Inactive" status row exists (CI runs with --no-seed)
    INSERT INTO public."UserStatuses" (id, status)
    VALUES (inactive_status, 'Inactive')
    ON CONFLICT (id) DO NOTHING;

    -- Setup: create inactive users with every role
    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer, status_uuid)
    VALUES ('InactiveAdmin', 'Test', 'inactive_admin@test.com', clerk_inactive_admin, true, false, inactive_status)
    RETURNING id INTO user_inactive_admin;

    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer, status_uuid)
    VALUES ('InactiveAM', 'Test', 'inactive_am@test.com', clerk_inactive_am, false, false, inactive_status)
    RETURNING id INTO user_inactive_am;
    INSERT INTO public."AccountManagers" (user_uuid, is_active)
    VALUES (user_inactive_am, true);

    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer, status_uuid)
    VALUES ('InactiveDev', 'Test', 'inactive_dev@test.com', clerk_inactive_dev, false, false, inactive_status)
    RETURNING id INTO user_inactive_dev;
    INSERT INTO public."Developers" (user_uuid, is_active, auto_subscribe_to_new_tickets)
    VALUES (user_inactive_dev, true, true);

    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer, status_uuid)
    VALUES ('InactiveViewer', 'Test', 'inactive_viewer@test.com', clerk_inactive_viewer, false, true, inactive_status)
    RETURNING id INTO user_inactive_viewer;

    -- ---- L1-L10: Helper function tests (run as postgres, no RLS) ----

    -- TEST L1: is_current_user_active() = false for inactive user
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_admin)::text, true);
    ASSERT public.is_current_user_active() = false,
      'L1 is_current_user_active should be false for inactive admin';
    RAISE NOTICE 'TEST L1 (inactive admin → is_current_user_active = false) ✓';

    -- TEST L2: is_current_user_active() = true for active user
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
    ASSERT public.is_current_user_active() = true,
      'L2 is_current_user_active should be true for active admin';
    RAISE NOTICE 'TEST L2 (active admin → is_current_user_active = true) ✓';

    -- TEST L3: get_user_roles() returns {} for inactive admin
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_admin)::text, true);
    SELECT public.get_user_roles() INTO v_roles;
    ASSERT v_roles = '{}'::text[],
      format('L3 inactive admin roles: expected {}, got %s', v_roles);
    RAISE NOTICE 'TEST L3 (inactive admin → get_user_roles = {}) ✓';

    -- TEST L4: get_user_roles() returns {} for inactive AM
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_am)::text, true);
    SELECT public.get_user_roles() INTO v_roles;
    ASSERT v_roles = '{}'::text[],
      format('L4 inactive AM roles: expected {}, got %s', v_roles);
    RAISE NOTICE 'TEST L4 (inactive AM → get_user_roles = {}) ✓';

    -- TEST L5: get_user_roles() returns {} for inactive developer
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_dev)::text, true);
    SELECT public.get_user_roles() INTO v_roles;
    ASSERT v_roles = '{}'::text[],
      format('L5 inactive dev roles: expected {}, got %s', v_roles);
    RAISE NOTICE 'TEST L5 (inactive dev → get_user_roles = {}) ✓';

    -- TEST L6: get_user_roles() returns {} for inactive viewer
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_viewer)::text, true);
    SELECT public.get_user_roles() INTO v_roles;
    ASSERT v_roles = '{}'::text[],
      format('L6 inactive viewer roles: expected {}, got %s', v_roles);
    RAISE NOTICE 'TEST L6 (inactive viewer → get_user_roles = {}) ✓';

    -- TEST L7: is_current_user_admin() = false for inactive admin
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_admin)::text, true);
    ASSERT public.is_current_user_admin() = false,
      'L7 inactive admin: is_current_user_admin should be false';
    RAISE NOTICE 'TEST L7 (inactive admin → is_current_user_admin = false) ✓';

    -- TEST L8: is_current_user_account_manager() = false for inactive AM
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_am)::text, true);
    ASSERT public.is_current_user_account_manager() = false,
      'L8 inactive AM: is_current_user_account_manager should be false';
    RAISE NOTICE 'TEST L8 (inactive AM → is_current_user_account_manager = false) ✓';

    -- TEST L9: get_current_account_manager_id() = NULL for inactive AM
    ASSERT public.get_current_account_manager_id() IS NULL,
      'L9 inactive AM: get_current_account_manager_id should be NULL';
    RAISE NOTICE 'TEST L9 (inactive AM → get_current_account_manager_id = NULL) ✓';

    -- TEST L10: get_current_user_uuid() = NULL for inactive user
    ASSERT public.get_current_user_uuid() IS NULL,
      'L10 inactive user: get_current_user_uuid should be NULL';
    RAISE NOTICE 'TEST L10 (inactive AM → get_current_user_uuid = NULL) ✓';

    -- ---- L11-L25: RLS access tests ----
    SET LOCAL ROLE authenticated;

    -- TEST L11: Inactive admin CANNOT select Bleachers
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_admin)::text, true);
    SELECT count(*) INTO v_count FROM public."Bleachers";
    ASSERT v_count = 0,
      format('L11 inactive admin select Bleachers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L11 (inactive admin → Bleachers SELECT blocked) ✓';

    -- TEST L12: Inactive admin CANNOT select RoadmapQuarters
    SELECT count(*) INTO v_count FROM public."RoadmapQuarters";
    ASSERT v_count = 0,
      format('L12 inactive admin select RoadmapQuarters: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L12 (inactive admin → RoadmapQuarters SELECT blocked) ✓';

    -- TEST L13: Inactive AM CANNOT select Bleachers
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_am)::text, true);
    SELECT count(*) INTO v_count FROM public."Bleachers";
    ASSERT v_count = 0,
      format('L13 inactive AM select Bleachers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L13 (inactive AM → Bleachers SELECT blocked) ✓';

    -- TEST L14: Inactive viewer CANNOT select Bleachers
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_viewer)::text, true);
    SELECT count(*) INTO v_count FROM public."Bleachers";
    ASSERT v_count = 0,
      format('L14 inactive viewer select Bleachers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L14 (inactive viewer → Bleachers SELECT blocked) ✓';

    -- TEST L15: Inactive developer CANNOT select RoadmapQuarters
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_dev)::text, true);
    SELECT count(*) INTO v_count FROM public."RoadmapQuarters";
    ASSERT v_count = 0,
      format('L15 inactive dev select RoadmapQuarters: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L15 (inactive dev → RoadmapQuarters SELECT blocked) ✓';

    -- TEST L16: Inactive admin CANNOT insert into Bleachers
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_admin)::text, true);
    BEGIN
      INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
      VALUES (5555, 3, 30);
      ASSERT false, 'L16 inactive admin insert Bleachers should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST L16 (inactive admin → Bleachers INSERT blocked) ✓';
    END;

    -- TEST L17: Inactive admin CANNOT update Bleachers
    UPDATE public."Bleachers" SET bleacher_seats = 999;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('L17 inactive admin update Bleachers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L17 (inactive admin → Bleachers UPDATE blocked) ✓';

    -- TEST L18: Inactive admin CANNOT delete from Bleachers
    DELETE FROM public."Bleachers";
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('L18 inactive admin delete Bleachers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L18 (inactive admin → Bleachers DELETE blocked) ✓';

    -- TEST L19: Inactive user CAN still read own Users row (self-read exception)
    SELECT count(*) INTO v_count FROM public."Users";
    ASSERT v_count = 1,
      format('L19 inactive admin Users self-read: expected 1 (self), got %s', v_count);
    RAISE NOTICE 'TEST L19 (inactive admin → Users SELECT self only) ✓';

    -- TEST L20: The one visible Users row is actually their own
    DECLARE
      v_clerk_id TEXT;
    BEGIN
      SELECT clerk_user_id INTO v_clerk_id FROM public."Users";
      ASSERT v_clerk_id = clerk_inactive_admin,
        format('L20 inactive admin Users: expected own clerk_id, got %s', v_clerk_id);
      RAISE NOTICE 'TEST L20 (inactive admin → Users row is own) ✓';
    END;

    -- TEST L21: Inactive AM CANNOT select Events
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_am)::text, true);
    SELECT count(*) INTO v_count FROM public."Events";
    ASSERT v_count = 0,
      format('L21 inactive AM select Events: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L21 (inactive AM → Events SELECT blocked) ✓';

    -- TEST L22: Inactive AM CANNOT insert Events
    BEGIN
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, must_be_clean, created_by_user_uuid)
      VALUES ('Inactive Event', '2026-12-01', '2026-12-01', false, false, user_inactive_am);
      ASSERT false, 'L22 inactive AM insert Event should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST L22 (inactive AM → Events INSERT blocked) ✓';
    END;

    -- TEST L23: Inactive AM CANNOT select Drivers
    SELECT count(*) INTO v_count FROM public."Drivers";
    ASSERT v_count = 0,
      format('L23 inactive AM select Drivers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L23 (inactive AM → Drivers SELECT blocked) ✓';

    -- TEST L24: Inactive AM CANNOT select WorkTrackers
    SELECT count(*) INTO v_count FROM public."WorkTrackers";
    ASSERT v_count = 0,
      format('L24 inactive AM select WorkTrackers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L24 (inactive AM → WorkTrackers SELECT blocked) ✓';

    -- TEST L25: Inactive admin CANNOT select MaintenanceEvents
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_admin)::text, true);
    SELECT count(*) INTO v_count FROM public."MaintenanceEvents";
    ASSERT v_count = 0,
      format('L25 inactive admin select MaintenanceEvents: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST L25 (inactive admin → MaintenanceEvents SELECT blocked) ✓';

    RAISE NOTICE '--- inactive role tests (L1-L25) passed ---';
  END;

  RESET ROLE;

  -- ==========================================================================
  -- PART M: Inactive USER (not just role) — full lockout
  -- M1-M10: user with ALL 4 roles, marked inactive → zero access
  -- M11-M16: user with NO roles, marked inactive → only self-read
  -- ==========================================================================
  DECLARE
    inactive_status_m CONSTANT UUID := '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5';

    user_inactive_super  UUID;
    user_inactive_plain  UUID;

    clerk_inactive_super TEXT := 'clerk_inactive_super';
    clerk_inactive_plain TEXT := 'clerk_inactive_plain';
  BEGIN
    -- Super-user: admin + AM + developer + viewer, but inactive
    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer, status_uuid)
    VALUES ('InactiveSuper', 'Test', 'inactive_super@test.com', clerk_inactive_super, true, true, inactive_status_m)
    RETURNING id INTO user_inactive_super;

    INSERT INTO public."AccountManagers" (user_uuid, is_active)
    VALUES (user_inactive_super, true);

    INSERT INTO public."Developers" (user_uuid, is_active, auto_subscribe_to_new_tickets)
    VALUES (user_inactive_super, true, true);

    -- Plain user: no roles at all, inactive
    INSERT INTO public."Users" (first_name, last_name, email, clerk_user_id, is_admin, is_viewer, status_uuid)
    VALUES ('InactivePlain', 'Test', 'inactive_plain@test.com', clerk_inactive_plain, false, false, inactive_status_m)
    RETURNING id INTO user_inactive_plain;

    -- ---- M1-M4: Super-user helper function tests ----

    -- TEST M1: get_user_roles() returns {} even with all 4 roles
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_super)::text, true);
    SELECT public.get_user_roles() INTO v_roles;
    ASSERT v_roles = '{}'::text[],
      format('M1 inactive super roles: expected {}, got %s', v_roles);
    RAISE NOTICE 'TEST M1 (inactive super-user → get_user_roles = {}) ✓';

    -- TEST M2: is_current_user_admin() = false
    ASSERT public.is_current_user_admin() = false,
      'M2 inactive super: is_current_user_admin should be false';
    RAISE NOTICE 'TEST M2 (inactive super-user → is_current_user_admin = false) ✓';

    -- TEST M3: is_current_user_account_manager() = false
    ASSERT public.is_current_user_account_manager() = false,
      'M3 inactive super: is_current_user_account_manager should be false';
    RAISE NOTICE 'TEST M3 (inactive super-user → is_current_user_account_manager = false) ✓';

    -- TEST M4: is_current_user_active() = false
    ASSERT public.is_current_user_active() = false,
      'M4 inactive super: is_current_user_active should be false';
    RAISE NOTICE 'TEST M4 (inactive super-user → is_current_user_active = false) ✓';

    -- ---- M5-M10: Super-user RLS tests ----
    SET LOCAL ROLE authenticated;

    -- TEST M5: Inactive super-user CANNOT select Bleachers (even with admin + AM + viewer)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_super)::text, true);
    SELECT count(*) INTO v_count FROM public."Bleachers";
    ASSERT v_count = 0,
      format('M5 inactive super select Bleachers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST M5 (inactive super-user → Bleachers SELECT blocked) ✓';

    -- TEST M6: Inactive super-user CANNOT select RoadmapQuarters (even with admin + developer)
    SELECT count(*) INTO v_count FROM public."RoadmapQuarters";
    ASSERT v_count = 0,
      format('M6 inactive super select RoadmapQuarters: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST M6 (inactive super-user → RoadmapQuarters SELECT blocked) ✓';

    -- TEST M7: Inactive super-user CANNOT select Events
    SELECT count(*) INTO v_count FROM public."Events";
    ASSERT v_count = 0,
      format('M7 inactive super select Events: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST M7 (inactive super-user → Events SELECT blocked) ✓';

    -- TEST M8: Inactive super-user CANNOT insert into Bleachers
    BEGIN
      INSERT INTO public."Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
      VALUES (4444, 2, 20);
      ASSERT false, 'M8 inactive super insert Bleachers should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST M8 (inactive super-user → Bleachers INSERT blocked) ✓';
    END;

    -- TEST M9: Inactive super-user sees ONLY own Users row
    SELECT count(*) INTO v_count FROM public."Users";
    ASSERT v_count = 1,
      format('M9 inactive super Users: expected 1 (self), got %s', v_count);
    RAISE NOTICE 'TEST M9 (inactive super-user → Users SELECT self only) ✓';

    -- TEST M10: Verify it's their own row
    DECLARE
      v_clerk_id_m TEXT;
    BEGIN
      SELECT clerk_user_id INTO v_clerk_id_m FROM public."Users";
      ASSERT v_clerk_id_m = clerk_inactive_super,
        format('M10 inactive super Users: expected own clerk_id, got %s', v_clerk_id_m);
      RAISE NOTICE 'TEST M10 (inactive super-user → Users row is own) ✓';
    END;

    -- ---- M11-M16: Plain user (no roles) inactive tests ----

    -- TEST M11: is_current_user_active() = false for inactive plain user
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_plain)::text, true);
    ASSERT public.is_current_user_active() = false,
      'M11 inactive plain: is_current_user_active should be false';
    RAISE NOTICE 'TEST M11 (inactive plain user → is_current_user_active = false) ✓';

    -- TEST M12: get_user_roles() returns {} (would be {} anyway, but confirm status check fires)
    SELECT public.get_user_roles() INTO v_roles;
    ASSERT v_roles = '{}'::text[],
      format('M12 inactive plain roles: expected {}, got %s', v_roles);
    RAISE NOTICE 'TEST M12 (inactive plain user → get_user_roles = {}) ✓';

    SET LOCAL ROLE authenticated;

    -- TEST M13: Inactive plain user sees only own Users row
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_inactive_plain)::text, true);
    SELECT count(*) INTO v_count FROM public."Users";
    ASSERT v_count = 1,
      format('M13 inactive plain Users: expected 1 (self), got %s', v_count);
    RAISE NOTICE 'TEST M13 (inactive plain user → Users SELECT self only) ✓';

    -- TEST M14: Verify it's their own row
    DECLARE
      v_clerk_id_m2 TEXT;
    BEGIN
      SELECT clerk_user_id INTO v_clerk_id_m2 FROM public."Users";
      ASSERT v_clerk_id_m2 = clerk_inactive_plain,
        format('M14 inactive plain Users: expected own clerk_id, got %s', v_clerk_id_m2);
      RAISE NOTICE 'TEST M14 (inactive plain user → Users row is own) ✓';
    END;

    -- TEST M15: Inactive plain user CANNOT select Bleachers
    SELECT count(*) INTO v_count FROM public."Bleachers";
    ASSERT v_count = 0,
      format('M15 inactive plain select Bleachers: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST M15 (inactive plain user → Bleachers SELECT blocked) ✓';

    -- TEST M16: Inactive plain user CANNOT select any table with generic rbac policies
    SELECT count(*) INTO v_count FROM public."Addresses";
    ASSERT v_count = 0,
      format('M16 inactive plain select Addresses: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST M16 (inactive plain user → Addresses SELECT blocked) ✓';

    RAISE NOTICE '--- all inactive user tests (M1-M16) passed ---';
  END;

  RESET ROLE;

  -- ==========================================================================
  -- PART N: Admin-only configuration pages
  -- /quickbooks (QboConnections), /inspection-questions (InspectionQuestions),
  -- /zones (Zones, ZoneStateProvinces, ZoneQboClasses)
  -- Admin has full CRUD. Everyone else = no access.
  -- ==========================================================================
  DECLARE
    zone_id        UUID;
    zone_sp_id     UUID;
    zone_qbo_id    UUID;
    qbo_conn_id    UUID;
    iq_id          UUID;
  BEGIN
    -- Setup: insert test data as postgres (bypass RLS)
    INSERT INTO public."QboConnections" (display_name, encrypted_token_value, realm_id)
    VALUES ('Test QBO', 'tok_test', 'realm_test')
    RETURNING id INTO qbo_conn_id;

    INSERT INTO public."Zones" (display_name, description)
    VALUES ('Test Zone', 'Zone for admin-only test')
    RETURNING id INTO zone_id;

    INSERT INTO public."ZoneStateProvinces" (zone_uuid, state_province)
    VALUES (zone_id, 'TX')
    RETURNING id INTO zone_sp_id;

    INSERT INTO public."ZoneQboClasses" (zone_uuid, qbo_class_id, qbo_connection_uuid)
    VALUES (zone_id, 'cls_test', qbo_conn_id)
    RETURNING id INTO zone_qbo_id;

    INSERT INTO public."InspectionQuestions" (question_text, question_type, required, sort_order, is_active)
    VALUES ('Test question?', 'text', true, 999, true)
    RETURNING id INTO iq_id;

    SET LOCAL ROLE authenticated;

    -- ---- N1-N5: Admin CAN CRUD all 5 tables ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

    -- TEST N1: Admin CAN select all config tables
    SELECT count(*) INTO v_count FROM public."QboConnections";
    ASSERT v_count > 0, format('N1 admin QboConnections: expected >0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."InspectionQuestions";
    ASSERT v_count > 0, format('N1 admin InspectionQuestions: expected >0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."Zones";
    ASSERT v_count > 0, format('N1 admin Zones: expected >0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."ZoneStateProvinces";
    ASSERT v_count > 0, format('N1 admin ZoneStateProvinces: expected >0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."ZoneQboClasses";
    ASSERT v_count > 0, format('N1 admin ZoneQboClasses: expected >0, got %s', v_count);
    RAISE NOTICE 'TEST N1 (admin → all config tables SELECT) ✓';

    -- TEST N2: Admin CAN insert into config tables
    INSERT INTO public."Zones" (display_name) VALUES ('Admin Zone');
    INSERT INTO public."InspectionQuestions" (question_text, question_type, required, sort_order, is_active)
    VALUES ('Admin Q?', 'text', false, 998, true);
    INSERT INTO public."QboConnections" (display_name, encrypted_token_value, realm_id)
    VALUES ('Admin QBO', 'tok_admin', 'realm_admin');
    RAISE NOTICE 'TEST N2 (admin → config tables INSERT) ✓';

    -- TEST N3: Admin CAN update config tables
    UPDATE public."Zones" SET display_name = 'Updated Zone' WHERE id = zone_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1, format('N3 admin update Zones: expected 1, got %s', v_count);
    UPDATE public."InspectionQuestions" SET question_text ='Updated?' WHERE id = iq_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1, format('N3 admin update IQ: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST N3 (admin → config tables UPDATE) ✓';

    -- TEST N4: Admin CAN delete from config tables
    DECLARE
      del_zone UUID;
    BEGIN
      RESET ROLE;
      INSERT INTO public."Zones" (display_name) VALUES ('To Delete') RETURNING id INTO del_zone;
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
      DELETE FROM public."Zones" WHERE id = del_zone;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1, format('N4 admin delete Zones: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST N4 (admin → config tables DELETE) ✓';
    END;

    -- ---- N5-N9: AM CANNOT access any config table ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

    -- TEST N5: AM CANNOT select config tables
    SELECT count(*) INTO v_count FROM public."QboConnections";
    ASSERT v_count = 0, format('N5 AM QboConnections: expected 0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."InspectionQuestions";
    ASSERT v_count = 0, format('N5 AM InspectionQuestions: expected 0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."Zones";
    ASSERT v_count = 0, format('N5 AM Zones: expected 0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."ZoneStateProvinces";
    ASSERT v_count = 0, format('N5 AM ZoneStateProvinces: expected 0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."ZoneQboClasses";
    ASSERT v_count = 0, format('N5 AM ZoneQboClasses: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST N5 (AM → all config tables SELECT blocked) ✓';

    -- TEST N6: AM CANNOT insert into config tables
    BEGIN
      INSERT INTO public."Zones" (display_name) VALUES ('AM Zone');
      ASSERT false, 'N6 AM insert Zones should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST N6a (AM → Zones INSERT blocked) ✓';
    END;
    BEGIN
      INSERT INTO public."InspectionQuestions" (question_text, question_type, required, sort_order, is_active)
      VALUES ('AM Q?', 'text', false, 997, true);
      ASSERT false, 'N6 AM insert IQ should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST N6b (AM → InspectionQuestions INSERT blocked) ✓';
    END;
    BEGIN
      INSERT INTO public."QboConnections" (display_name, encrypted_token_value, realm_id)
      VALUES ('AM QBO', 'tok_am', 'realm_am');
      ASSERT false, 'N6 AM insert QboConnections should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST N6c (AM → QboConnections INSERT blocked) ✓';
    END;

    -- TEST N7: AM CANNOT update config tables
    UPDATE public."Zones" SET display_name = 'Hacked' WHERE id = zone_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0, format('N7 AM update Zones: expected 0, got %s', v_count);
    UPDATE public."InspectionQuestions" SET question_text ='Hacked?' WHERE id = iq_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0, format('N7 AM update IQ: expected 0, got %s', v_count);
    UPDATE public."QboConnections" SET display_name = 'Hacked' WHERE id = qbo_conn_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0, format('N7 AM update QboConnections: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST N7 (AM → config tables UPDATE blocked) ✓';

    -- TEST N8: AM CANNOT delete from config tables
    DELETE FROM public."Zones" WHERE id = zone_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0, format('N8 AM delete Zones: expected 0, got %s', v_count);
    DELETE FROM public."QboConnections" WHERE id = qbo_conn_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0, format('N8 AM delete QboConnections: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST N8 (AM → config tables DELETE blocked) ✓';

    -- ---- N9-N10: Viewer and Developer also blocked ----

    -- TEST N9: Viewer CANNOT select config tables
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);
    SELECT count(*) INTO v_count FROM public."QboConnections";
    ASSERT v_count = 0, format('N9 viewer QboConnections: expected 0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."InspectionQuestions";
    ASSERT v_count = 0, format('N9 viewer InspectionQuestions: expected 0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."Zones";
    ASSERT v_count = 0, format('N9 viewer Zones: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST N9 (viewer → config tables SELECT blocked) ✓';

    -- TEST N10: Developer CANNOT select config tables
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev)::text, true);
    SELECT count(*) INTO v_count FROM public."QboConnections";
    ASSERT v_count = 0, format('N10 dev QboConnections: expected 0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."InspectionQuestions";
    ASSERT v_count = 0, format('N10 dev InspectionQuestions: expected 0, got %s', v_count);
    SELECT count(*) INTO v_count FROM public."Zones";
    ASSERT v_count = 0, format('N10 dev Zones: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST N10 (developer → config tables SELECT blocked) ✓';

    RAISE NOTICE '--- all admin-only config page tests (N1-N10) passed ---';
  END;

  RESET ROLE;

  -- ==========================================================================
  -- PART O: ScorecardTargets — admin CRUD, AM + viewer read-only
  -- ==========================================================================
  DECLARE
    st_am_id       UUID;   -- AccountManagers.id for the AM user
    st_target_id   UUID;   -- ScorecardTargets row id
  BEGIN
    -- Setup: find AM's AccountManagers row and insert a target as postgres
    SELECT am.id INTO st_am_id
    FROM public."AccountManagers" am
    JOIN public."Users" u ON u.id = am.user_uuid
    WHERE u.clerk_user_id = clerk_am;

    INSERT INTO public."ScorecardTargets" (account_manager_uuid)
    VALUES (st_am_id)
    RETURNING id INTO st_target_id;

    SET LOCAL ROLE authenticated;

    -- ---- O1-O4: Admin CAN full CRUD ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

    -- TEST O1: Admin CAN select
    SELECT count(*) INTO v_count FROM public."ScorecardTargets";
    ASSERT v_count > 0, format('O1 admin SELECT: expected >0, got %s', v_count);
    RAISE NOTICE 'TEST O1 (admin → ScorecardTargets SELECT) ✓';

    -- TEST O2: Admin CAN insert
    DECLARE st_new UUID;
    BEGIN
      -- Need another AM for unique constraint; use admin_all's AM row
      DECLARE st_admin_am UUID;
      BEGIN
        SELECT am.id INTO st_admin_am
        FROM public."AccountManagers" am
        JOIN public."Users" u ON u.id = am.user_uuid
        WHERE u.clerk_user_id = clerk_admin_all;

        INSERT INTO public."ScorecardTargets" (account_manager_uuid)
        VALUES (st_admin_am)
        RETURNING id INTO st_new;
        RAISE NOTICE 'TEST O2 (admin → ScorecardTargets INSERT) ✓';

        -- TEST O3: Admin CAN update
        UPDATE public."ScorecardTargets" SET quotes_weekly = 99 WHERE id = st_new;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        ASSERT v_count = 1, format('O3 admin UPDATE: expected 1, got %s', v_count);
        RAISE NOTICE 'TEST O3 (admin → ScorecardTargets UPDATE) ✓';

        -- TEST O4: Admin CAN delete
        DELETE FROM public."ScorecardTargets" WHERE id = st_new;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        ASSERT v_count = 1, format('O4 admin DELETE: expected 1, got %s', v_count);
        RAISE NOTICE 'TEST O4 (admin → ScorecardTargets DELETE) ✓';
      END;
    END;

    -- ---- O5-O8: AM CAN read, CANNOT write ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

    -- TEST O5: AM CAN select
    SELECT count(*) INTO v_count FROM public."ScorecardTargets";
    ASSERT v_count > 0, format('O5 AM SELECT: expected >0, got %s', v_count);
    RAISE NOTICE 'TEST O5 (AM → ScorecardTargets SELECT) ✓';

    -- TEST O6: AM CANNOT insert
    BEGIN
      INSERT INTO public."ScorecardTargets" (account_manager_uuid) VALUES (st_am_id);
      ASSERT false, 'O6 AM INSERT should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST O6 (AM → ScorecardTargets INSERT blocked) ✓';
    END;

    -- TEST O7: AM CANNOT update
    UPDATE public."ScorecardTargets" SET quotes_weekly = 999 WHERE id = st_target_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0, format('O7 AM UPDATE: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST O7 (AM → ScorecardTargets UPDATE blocked) ✓';

    -- TEST O8: AM CANNOT delete
    DELETE FROM public."ScorecardTargets" WHERE id = st_target_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0, format('O8 AM DELETE: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST O8 (AM → ScorecardTargets DELETE blocked) ✓';

    -- ---- O9-O10: Viewer CAN read, CANNOT write ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);

    -- TEST O9: Viewer CAN select
    SELECT count(*) INTO v_count FROM public."ScorecardTargets";
    ASSERT v_count > 0, format('O9 viewer SELECT: expected >0, got %s', v_count);
    RAISE NOTICE 'TEST O9 (viewer → ScorecardTargets SELECT) ✓';

    -- TEST O10: Viewer CANNOT insert
    BEGIN
      INSERT INTO public."ScorecardTargets" (account_manager_uuid) VALUES (st_am_id);
      ASSERT false, 'O10 viewer INSERT should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST O10 (viewer → ScorecardTargets INSERT blocked) ✓';
    END;

    RAISE NOTICE '--- all ScorecardTargets tests (O1-O10) passed ---';
  END;

  RESET ROLE;

  -- ==========================================================================
  -- PART P: Roadmap table permissions
  --   RoadmapQuarters/Sprints/Features: admin CRUD, developer SELECT only
  --   RoadmapTasks: admin+developer CRUD, AM SELECT+INSERT+UPDATE, viewer SELECT
  -- ==========================================================================
  DECLARE
    rq_id          UUID;
    rs_id          UUID;
    rf_id          UUID;
    rt_id          UUID;
  BEGIN
    RAISE NOTICE '--- Roadmap permissions tests (P1-P14) ---';

    INSERT INTO public."RoadmapQuarters" (quarter, year) VALUES (2, 2998)
    RETURNING id INTO rq_id;

    INSERT INTO public."RoadmapSprints" (quarter_id, sprint_number, start_date, end_date)
    VALUES (rq_id, 1, '2998-04-01', '2998-04-14')
    RETURNING id INTO rs_id;

    INSERT INTO public."RoadmapFeatures" (quarter_id, title) VALUES (rq_id, 'Test Feature')
    RETURNING id INTO rf_id;

    INSERT INTO public."RoadmapTasks" (title, is_backlog) VALUES ('Test Task', true)
    RETURNING id INTO rt_id;

    SET LOCAL ROLE authenticated;

    -- ---- P1: Admin CRUD on RoadmapQuarters ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

    SELECT count(*) INTO v_count FROM public."RoadmapQuarters" WHERE id = rq_id;
    ASSERT v_count = 1, format('P1a admin SELECT RoadmapQuarters: expected 1, got %s', v_count);

    UPDATE public."RoadmapQuarters" SET year = 2997 WHERE id = rq_id;
    RAISE NOTICE 'TEST P1 (admin → RoadmapQuarters CRUD) ✓';

    -- ---- P2: Developer SELECT on RoadmapQuarters, INSERT blocked ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev)::text, true);

    SELECT count(*) INTO v_count FROM public."RoadmapQuarters" WHERE id = rq_id;
    ASSERT v_count = 1, format('P2a dev SELECT RoadmapQuarters: expected 1, got %s', v_count);

    BEGIN
      INSERT INTO public."RoadmapQuarters" (quarter, year) VALUES (3, 2998);
      ASSERT false, 'P2b dev INSERT RoadmapQuarters should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST P2 (developer → RoadmapQuarters SELECT ok, INSERT blocked) ✓';
    END;

    -- ---- P3: Developer SELECT on RoadmapSprints, INSERT blocked ----
    SELECT count(*) INTO v_count FROM public."RoadmapSprints" WHERE id = rs_id;
    ASSERT v_count = 1, format('P3a dev SELECT RoadmapSprints: expected 1, got %s', v_count);

    BEGIN
      INSERT INTO public."RoadmapSprints" (quarter_id, sprint_number, start_date, end_date)
      VALUES (rq_id, 2, '2998-04-15', '2998-04-28');
      ASSERT false, 'P3b dev INSERT RoadmapSprints should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST P3 (developer → RoadmapSprints SELECT ok, INSERT blocked) ✓';
    END;

    -- ---- P4: Developer SELECT on RoadmapFeatures, INSERT blocked ----
    SELECT count(*) INTO v_count FROM public."RoadmapFeatures" WHERE id = rf_id;
    ASSERT v_count = 1, format('P4a dev SELECT RoadmapFeatures: expected 1, got %s', v_count);

    BEGIN
      INSERT INTO public."RoadmapFeatures" (quarter_id, title) VALUES (rq_id, 'Blocked');
      ASSERT false, 'P4b dev INSERT RoadmapFeatures should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST P4 (developer → RoadmapFeatures SELECT ok, INSERT blocked) ✓';
    END;

    -- ---- P5: AM CANNOT select RoadmapQuarters/Sprints/Features ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_am)::text, true);

    SELECT count(*) INTO v_count FROM public."RoadmapQuarters" WHERE id = rq_id;
    ASSERT v_count = 0, format('P5a AM SELECT RoadmapQuarters: expected 0, got %s', v_count);

    SELECT count(*) INTO v_count FROM public."RoadmapSprints" WHERE id = rs_id;
    ASSERT v_count = 0, format('P5b AM SELECT RoadmapSprints: expected 0, got %s', v_count);

    SELECT count(*) INTO v_count FROM public."RoadmapFeatures" WHERE id = rf_id;
    ASSERT v_count = 0, format('P5c AM SELECT RoadmapFeatures: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST P5 (AM → Quarters/Sprints/Features blocked) ✓';

    -- ---- P6: AM CAN select RoadmapTasks ----
    SELECT count(*) INTO v_count FROM public."RoadmapTasks" WHERE id = rt_id;
    ASSERT v_count = 1, format('P6 AM SELECT RoadmapTasks: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST P6 (AM → RoadmapTasks SELECT) ✓';

    -- ---- P7: AM CAN insert RoadmapTasks ----
    INSERT INTO public."RoadmapTasks" (title, is_backlog) VALUES ('AM Ticket', true);
    RAISE NOTICE 'TEST P7 (AM → RoadmapTasks INSERT) ✓';

    -- ---- P8: AM CAN update RoadmapTasks ----
    UPDATE public."RoadmapTasks" SET title = 'AM Updated' WHERE id = rt_id;
    RAISE NOTICE 'TEST P8 (AM → RoadmapTasks UPDATE) ✓';

    -- ---- P9: AM CANNOT delete RoadmapTasks (RLS silently filters, no exception) ----
    DELETE FROM public."RoadmapTasks" WHERE id = rt_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('P9 AM DELETE RoadmapTasks: expected 0 deleted, got %s', v_count);
    RAISE NOTICE 'TEST P9 (AM → RoadmapTasks DELETE blocked) ✓';

    -- ---- P10: Viewer CAN select RoadmapTasks ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_viewer)::text, true);

    SELECT count(*) INTO v_count FROM public."RoadmapTasks" WHERE id = rt_id;
    ASSERT v_count = 1, format('P10 viewer SELECT RoadmapTasks: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST P10 (viewer → RoadmapTasks SELECT) ✓';

    -- ---- P11: Viewer CANNOT insert RoadmapTasks ----
    BEGIN
      INSERT INTO public."RoadmapTasks" (title, is_backlog) VALUES ('Viewer Ticket', true);
      ASSERT false, 'P11 viewer INSERT RoadmapTasks should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST P11 (viewer → RoadmapTasks INSERT blocked) ✓';
    END;

    -- ---- P12: Viewer CANNOT select RoadmapQuarters ----
    SELECT count(*) INTO v_count FROM public."RoadmapQuarters" WHERE id = rq_id;
    ASSERT v_count = 0, format('P12 viewer SELECT RoadmapQuarters: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST P12 (viewer → RoadmapQuarters blocked) ✓';

    -- ---- P13: Developer CAN select+insert+update RoadmapTasks ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_dev)::text, true);

    INSERT INTO public."RoadmapTasks" (title, is_backlog) VALUES ('Dev Task', true);
    UPDATE public."RoadmapTasks" SET title = 'Dev Updated' WHERE id = rt_id;
    RAISE NOTICE 'TEST P13 (developer → RoadmapTasks SELECT+INSERT+UPDATE) ✓';

    -- ---- P14: Developer CANNOT hard-delete RoadmapTasks (RLS silently filters) ----
    DELETE FROM public."RoadmapTasks" WHERE id = rt_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('P14 dev DELETE RoadmapTasks: expected 0 deleted, got %s', v_count);
    RAISE NOTICE 'TEST P14 (developer → RoadmapTasks DELETE blocked) ✓';

    -- ---- P15: Admin CAN delete RoadmapTasks ----
    PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);

    DELETE FROM public."RoadmapTasks" WHERE id = rt_id;
    RAISE NOTICE 'TEST P15 (admin → RoadmapTasks DELETE) ✓';

    RAISE NOTICE '--- all Roadmap tests (P1-P15) passed ---';
  END;

  RESET ROLE;

  RAISE NOTICE '--- all multi-role RLS tests passed ---';
END;
$$;

SELECT ok(true, 'all assertions passed');
SELECT * FROM finish();

ROLLBACK;
