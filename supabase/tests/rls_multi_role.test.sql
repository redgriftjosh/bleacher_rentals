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
    INSERT INTO public."Events" (event_name, event_start, event_end, lenient, booked, must_be_clean, created_by_user_uuid)
    VALUES ('AM Own Event', '2026-07-01', '2026-07-01', false, false, false, user_am)
    RETURNING id INTO event_own;

    INSERT INTO public."Events" (event_name, event_start, event_end, lenient, booked, must_be_clean, created_by_user_uuid)
    VALUES ('Other AM Event', '2026-07-02', '2026-07-02', false, false, false, user_admin_all)
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
    INSERT INTO public."Events" (event_name, event_start, event_end, lenient, booked, must_be_clean, created_by_user_uuid)
    VALUES ('AM New Event', '2026-08-01', '2026-08-01', false, false, false, user_am);
    RAISE NOTICE 'TEST G2 (AM → Events INSERT own) ✓';

    -- TEST G3: AM CANNOT insert event with other user as owner
    BEGIN
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, booked, must_be_clean, created_by_user_uuid)
      VALUES ('Fake Event', '2026-09-01', '2026-09-01', false, false, false, user_admin);
      ASSERT false, 'G3 AM insert event for other should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST G3 (AM → Events INSERT for other blocked) ✓';
    END;

    -- TEST G4: AM CAN update own event
    UPDATE public."Events" SET event_name = 'Updated Own Event' WHERE id = event_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('G4 AM update own event: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST G4 (AM → Events UPDATE own) ✓';

    -- TEST G5: AM CANNOT update other's event
    UPDATE public."Events" SET event_name = 'Hacked' WHERE id = event_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('G5 AM update other event: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST G5 (AM → Events UPDATE other blocked) ✓';

    -- TEST G6: AM CAN delete own event
    -- (create a throwaway event to delete)
    DECLARE
      event_to_delete UUID;
    BEGIN
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, booked, must_be_clean, created_by_user_uuid)
      VALUES ('To Delete', '2026-10-01', '2026-10-01', false, false, false, user_am)
      RETURNING id INTO event_to_delete;

      DELETE FROM public."Events" WHERE id = event_to_delete;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('G6 AM delete own event: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST G6 (AM → Events DELETE own) ✓';
    END;

    -- TEST G7: AM CANNOT delete other's event
    DELETE FROM public."Events" WHERE id = event_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('G7 AM delete other event: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST G7 (AM → Events DELETE other blocked) ✓';

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
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, booked, must_be_clean, created_by_user_uuid)
      VALUES ('Admin Del', '2026-11-01', '2026-11-01', false, false, false, user_admin)
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
      INSERT INTO public."Events" (event_name, event_start, event_end, lenient, booked, must_be_clean, created_by_user_uuid)
      VALUES ('Viewer Event', '2026-12-01', '2026-12-01', false, false, false, user_viewer);
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

        -- TEST H2: AM CANNOT insert BleacherEvent for other's event
        BEGIN
          INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
          VALUES (event_other, bleacher_own);
          ASSERT false, 'H2 AM insert BE for other event should have failed';
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'TEST H2 (AM → BleacherEvents INSERT other event blocked) ✓';
        END;

        -- TEST H3: AM CANNOT insert BleacherEvent for own event + other's bleacher
        BEGIN
          INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
          VALUES (event_own, bleacher_other);
          ASSERT false, 'H3 AM insert BE for other bleacher should have failed';
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'TEST H3 (AM → BleacherEvents INSERT other bleacher blocked) ✓';
        END;

        -- TEST H4: AM CANNOT insert BleacherEvent for own event + unassigned bleacher
        BEGIN
          INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
          VALUES (event_own, bleacher_none);
          ASSERT false, 'H4 AM insert BE for unassigned bleacher should have failed';
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'TEST H4 (AM → BleacherEvents INSERT unassigned bleacher blocked) ✓';
        END;

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

        -- TEST H7: AM CANNOT delete BleacherEvent from other's event
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
          ASSERT v_count = 0,
            format('H7 AM delete other BE: expected 0, got %s', v_count);
          RAISE NOTICE 'TEST H7 (AM → BleacherEvents DELETE other event blocked) ✓';

          -- TEST H8: Admin CAN insert BleacherEvent for any event + any bleacher
          PERFORM set_config('request.jwt.claims', json_build_object('sub', clerk_admin)::text, true);
          INSERT INTO public."BleacherEvents" (event_uuid, bleacher_uuid)
          VALUES (event_own, bleacher_other);
          RAISE NOTICE 'TEST H8 (admin → BleacherEvents INSERT any) ✓';

          -- TEST H9: Admin CAN delete any BleacherEvent
          DELETE FROM public."BleacherEvents" WHERE id = be_other;
          GET DIAGNOSTICS v_count = ROW_COUNT;
          ASSERT v_count = 1,
            format('H9 admin delete any BE: expected 1, got %s', v_count);
          RAISE NOTICE 'TEST H9 (admin → BleacherEvents DELETE any) ✓';

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

    -- TEST I4: AM CANNOT insert WorkTracker with other user as created_by
    BEGIN
      INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
      VALUES ('2026-08-03', user_admin, driver_own_i, bleacher_own_i);
      ASSERT false, 'I4 AM insert WT for other should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST I4 (AM → WorkTrackers INSERT for other blocked) ✓';
    END;

    -- TEST I5: AM CANNOT insert WorkTracker with other AM's driver
    BEGIN
      INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
      VALUES ('2026-08-04', user_am, driver_other_i, bleacher_own_i);
      ASSERT false, 'I5 AM insert WT with other driver should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST I5 (AM → WorkTrackers INSERT other AM driver blocked) ✓';
    END;

    -- TEST I6: AM CANNOT insert WorkTracker with other AM's bleacher
    BEGIN
      INSERT INTO public."WorkTrackers" (date, created_by_user_uuid, driver_uuid, bleacher_uuid)
      VALUES ('2026-08-05', user_am, driver_own_i, bleacher_other_i);
      ASSERT false, 'I6 AM insert WT with other bleacher should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST I6 (AM → WorkTrackers INSERT other AM bleacher blocked) ✓';
    END;

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

    -- TEST I9: AM CANNOT update other AM's WorkTracker
    UPDATE public."WorkTrackers" SET notes = 'Hacked' WHERE id = wt_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('I9 AM update other WT: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST I9 (AM → WorkTrackers UPDATE other blocked) ✓';

    -- TEST I10: AM CANNOT update own WT to use other AM's bleacher (WITH CHECK)
    BEGIN
      UPDATE public."WorkTrackers" SET bleacher_uuid = bleacher_other_i WHERE id = wt_own;
      ASSERT false, 'I10 AM update WT bleacher to other should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST I10 (AM → WorkTrackers UPDATE bleacher to other blocked) ✓';
    END;

    -- TEST I11: AM CANNOT update own WT to use other AM's driver (WITH CHECK)
    BEGIN
      UPDATE public."WorkTrackers" SET driver_uuid = driver_other_i WHERE id = wt_own;
      ASSERT false, 'I11 AM update WT driver to other should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST I11 (AM → WorkTrackers UPDATE driver to other blocked) ✓';
    END;

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

    -- TEST I13: AM CANNOT delete other AM's WorkTracker
    DELETE FROM public."WorkTrackers" WHERE id = wt_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('I13 AM delete other WT: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST I13 (AM → WorkTrackers DELETE other blocked) ✓';

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

    -- TEST J3: AM CANNOT insert maintenance event for other user
    BEGIN
      INSERT INTO public."MaintenanceEvents" (event_name, event_start, event_end, created_by_user_uuid)
      VALUES ('Fake Maint', '2026-09-01', '2026-09-10', user_admin);
      ASSERT false, 'J3 AM insert maint for other should have failed';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST J3 (AM → MaintenanceEvents INSERT for other blocked) ✓';
    END;

    -- TEST J4: AM CAN update own maintenance event
    UPDATE public."MaintenanceEvents" SET event_name = 'Updated Maint' WHERE id = me_own;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 1,
      format('J4 AM update own maint: expected 1, got %s', v_count);
    RAISE NOTICE 'TEST J4 (AM → MaintenanceEvents UPDATE own) ✓';

    -- TEST J5: AM CANNOT update other's maintenance event
    UPDATE public."MaintenanceEvents" SET event_name = 'Hacked' WHERE id = me_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('J5 AM update other maint: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST J5 (AM → MaintenanceEvents UPDATE other blocked) ✓';

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

    -- TEST J7: AM CANNOT delete other's maintenance event
    DELETE FROM public."MaintenanceEvents" WHERE id = me_other;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    ASSERT v_count = 0,
      format('J7 AM delete other maint: expected 0, got %s', v_count);
    RAISE NOTICE 'TEST J7 (AM → MaintenanceEvents DELETE other blocked) ✓';

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

      -- TEST K2: AM CANNOT insert BleacherMaintEvent with other's event
      BEGIN
        INSERT INTO public."BleacherMaintEvents" (maintenance_event_uuid, bleacher_uuid)
        VALUES (me_other, bleacher_own_k);
        ASSERT false, 'K2 AM insert BME other event should have failed';
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'TEST K2 (AM → BleacherMaintEvents INSERT other event blocked) ✓';
      END;

      -- TEST K3: AM CANNOT insert BleacherMaintEvent with other's bleacher
      BEGIN
        INSERT INTO public."BleacherMaintEvents" (maintenance_event_uuid, bleacher_uuid)
        VALUES (me_own, bleacher_other_k);
        ASSERT false, 'K3 AM insert BME other bleacher should have failed';
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'TEST K3 (AM → BleacherMaintEvents INSERT other bleacher blocked) ✓';
      END;

      -- TEST K4: AM CAN delete BleacherMaintEvent from own event
      DELETE FROM public."BleacherMaintEvents" WHERE id = bme_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      ASSERT v_count = 1,
        format('K4 AM delete own BME: expected 1, got %s', v_count);
      RAISE NOTICE 'TEST K4 (AM → BleacherMaintEvents DELETE own event) ✓';

      -- TEST K5: AM CANNOT delete BleacherMaintEvent from other's event
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
        ASSERT v_count = 0,
          format('K5 AM delete other BME: expected 0, got %s', v_count);
        RAISE NOTICE 'TEST K5 (AM → BleacherMaintEvents DELETE other event blocked) ✓';
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

  RAISE NOTICE '--- all multi-role RLS tests passed ---';
END;
$$;

SELECT ok(true, 'all assertions passed');
SELECT * FROM finish();

ROLLBACK;
