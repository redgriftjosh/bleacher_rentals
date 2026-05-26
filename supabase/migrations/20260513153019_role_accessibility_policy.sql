-- =============================================================
-- RBAC Zero-Trust RLS Migration (multi-role)
--
-- Principle: everything is denied unless explicitly allowed.
-- Roles are ADDITIVE — a user can hold multiple roles at once.
-- get_user_roles() returns text[] of all active roles.
--
-- Role detection:
--   admin           → Users.is_admin = true
--   account_manager → active row in AccountManagers
--   developer       → active row in Developers
--   viewer          → Users.is_viewer = true
--
-- Viewer is read-only (SELECT only).
-- Users table gets special self-read policy to avoid recursion.
-- _powersync_unhandled is excluded (Supabase internal).
-- =============================================================

-- =====================
-- 0. Ensure is_viewer column exists (needed by get_user_roles below)
-- =====================
alter table public."Users"
  add column if not exists is_viewer boolean not null default false;

-- =====================
-- 1. Helper: get_user_roles()
--    SECURITY DEFINER so it can read Users bypassing RLS.
--    Returns text[] of all active roles for the current user.
-- =====================
create or replace function public.get_user_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(role) from (
        select 'admin' as role
          where u.is_admin = true
        union all
        select 'account_manager'
          where exists (
            select 1 from "AccountManagers" am
            where am.user_uuid = u.id and am.is_active = true
          )
        union all
        select 'developer'
          where exists (
            select 1 from "Developers" d
            where d.user_uuid = u.id and d.is_active = true
          )
        union all
        select 'viewer'
          where u.is_viewer = true
      ) roles
    ),
    '{}'::text[]
  )
  from "Users" u
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
  limit 1;
$$;

-- =====================
-- 2. Apply RBAC policies to all public tables
-- =====================
do $$
declare
  tbl text;
  pol record;

  developer_tables text[] := array[
    'RoadmapQuarters',
    'RoadmapSprints',
    'RoadmapFeatures',
    'RoadmapFeatureSprintLabels',
    'RoadmapTasks',
    'RoadmapBacklogTickets',
    'RoadmapTaskSubscriptions',
    'RoadmapTaskMessages',
    'RoadmapTaskMessageReadReceipts',
    'RoadmapTaskTypingIndicators',
    'RoadmapAttachments'
  ];

  account_manager_tables text[] := array[
    'Addresses',
    'Alerts',
    'BleacherUsers',
    'Bleachers',
    'Blocks',
    'BlueBook',
    'DamageReportPhotos',
    'DamageReports',
    'DashboardFilterSettings',
    'Drivers',
    'DriverScoreCardStats',
    'DriverScorecardStatsPerDriver',
    'DriverUnavailability',
    'HomeBases',
    'InspectionPhotos',
    'MaintenancePhotos',
    'Notifications',
    'Tasks',
    'UserAlerts',
    'UserHomeBases',
    'UserRoles',
    'UserStatuses',
    'Vehicles',
    'Vendors',
    'WorkTrackerGroups',
    'WorkTrackerInspections',
    'WorkTrackerTypeQboAccounts',
    'WorkTrackerTypes',
    'AccountManagers'
  ];

  viewer_tables text[] := array[
    'Addresses',
    'Alerts',
    'BleacherUsers',
    'Bleachers',
    'Blocks',
    'DashboardFilterSettings',
    'HomeBases',
    'Notifications',
    'Tasks',
    'UserAlerts',
    'UserRoles',
    'UserStatuses',
    'WorkTrackerGroups'
  ];

  skip_tables text[] := array[
    'Users',
    'Drivers',
    'Bleachers',
    'Events',
    'BleacherEvents',
    'WorkTrackers',
    'MaintenanceEvents',
    'BleacherMaintEvents',
    'ScorecardTargets',
    '_powersync_unhandled'
  ];

  select_roles text[];
  write_roles  text[];
begin
  for tbl in
    select tablename from pg_tables where schemaname = 'public'
  loop
    if tbl = any(skip_tables) then continue; end if;

    -- Drop all existing policies
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;

    execute format('alter table public.%I enable row level security', tbl);

    -- Build allowed-role arrays for this table
    select_roles := ARRAY['admin'];
    write_roles  := ARRAY['admin'];

    if tbl = any(account_manager_tables) then
      select_roles := select_roles || ARRAY['account_manager'];
      write_roles  := write_roles  || ARRAY['account_manager'];
    end if;

    if tbl = any(developer_tables) then
      select_roles := select_roles || ARRAY['developer'];
      write_roles  := write_roles  || ARRAY['developer'];
    end if;

    if tbl = any(viewer_tables) then
      select_roles := select_roles || ARRAY['viewer'];
      -- viewer NOT added to write_roles (read-only)
    end if;

    -- SELECT
    execute format(
      $p$create policy "rbac_select" on public.%I
         as permissive for select to authenticated
         using (
           public.get_user_roles() && %L::text[]
         )$p$,
      tbl, select_roles
    );

    -- INSERT
    execute format(
      $p$create policy "rbac_insert" on public.%I
         as permissive for insert to authenticated
         with check (
           public.get_user_roles() && %L::text[]
         )$p$,
      tbl, write_roles
    );

    -- UPDATE
    execute format(
      $p$create policy "rbac_update" on public.%I
         as permissive for update to authenticated
         using (
           public.get_user_roles() && %L::text[]
         )$p$,
      tbl, write_roles
    );

    -- DELETE
    execute format(
      $p$create policy "rbac_delete" on public.%I
         as permissive for delete to authenticated
         using (
           public.get_user_roles() && %L::text[]
         )$p$,
      tbl, write_roles
    );

  end loop;
end;
$$;

-- =====================
-- 2b. ScorecardTargets: admin full CRUD, AM + viewer read-only
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'ScorecardTargets'
  loop
    execute format('drop policy if exists %I on public."ScorecardTargets"', pol.policyname);
  end loop;
end;
$$;

alter table public."ScorecardTargets" enable row level security;

create policy "rbac_select" on public."ScorecardTargets"
  as permissive for select to authenticated
  using (public.get_user_roles() && '{admin,account_manager,viewer}'::text[]);

create policy "rbac_insert" on public."ScorecardTargets"
  as permissive for insert to authenticated
  with check (public.get_user_roles() && '{admin}'::text[]);

create policy "rbac_update" on public."ScorecardTargets"
  as permissive for update to authenticated
  using (public.get_user_roles() && '{admin}'::text[]);

create policy "rbac_delete" on public."ScorecardTargets"
  as permissive for delete to authenticated
  using (public.get_user_roles() && '{admin}'::text[]);

-- =====================
-- 3. Helper for Users policies: bypasses RLS to check admin status
-- =====================
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from "Users"
     where clerk_user_id = (auth.jwt() ->> 'sub')
     limit 1),
    false
  );
$$;

-- =====================
-- 3b. Helper: is current user an active account manager?
-- =====================
create or replace function public.is_current_user_account_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from "AccountManagers" am
    join "Users" u on u.id = am.user_uuid
    where u.clerk_user_id = (auth.jwt() ->> 'sub')
      and am.is_active = true
  );
$$;

-- =====================
-- 4. Special policy for Users (uses SECURITY DEFINER helper — avoids recursion)
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'Users'
  loop
    execute format('drop policy if exists %I on public."Users"', pol.policyname);
  end loop;
end;
$$;

alter table public."Users" enable row level security;

create policy "users_select" on public."Users"
  as permissive for select to authenticated
  using (
    clerk_user_id = (auth.jwt() ->> 'sub')
    or public.is_current_user_admin()
    or public.is_current_user_account_manager()
  );

create policy "users_insert" on public."Users"
  as permissive for insert to authenticated
  with check (
    public.is_current_user_admin()
    or public.is_current_user_account_manager()
  );

create policy "users_update" on public."Users"
  as permissive for update to authenticated
  using (
    clerk_user_id = (auth.jwt() ->> 'sub')
    or public.is_current_user_admin()
  );

create policy "users_delete" on public."Users"
  as permissive for delete to authenticated
  using (
    public.is_current_user_admin()
  );

-- =====================
-- 5. Helper: get current user's AccountManagers.id
-- =====================
create or replace function public.get_current_account_manager_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select am.id
  from "AccountManagers" am
  join "Users" u on u.id = am.user_uuid
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
    and am.is_active = true
  limit 1;
$$;

-- =====================
-- 6. Custom policies for Drivers
--    SELECT/INSERT/DELETE: admin + account_manager (same as generic)
--    UPDATE: AM can only update own or unassigned drivers,
--            and can only set account_manager_uuid to self or null.
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'Drivers'
  loop
    execute format('drop policy if exists %I on public."Drivers"', pol.policyname);
  end loop;
end;
$$;

alter table public."Drivers" enable row level security;

create policy "drivers_select" on public."Drivers"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "drivers_insert" on public."Drivers"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "drivers_update" on public."Drivers"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and (
        account_manager_uuid is null
        or account_manager_uuid = public.get_current_account_manager_id()
      )
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and (
        account_manager_uuid is null
        or account_manager_uuid = public.get_current_account_manager_id()
      )
    )
  );

create policy "drivers_delete" on public."Drivers"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- =====================
-- 7. Custom policies for Bleachers
--    SELECT: all roles can view
--    INSERT/UPDATE/DELETE: admin only
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'Bleachers'
  loop
    execute format('drop policy if exists %I on public."Bleachers"', pol.policyname);
  end loop;
end;
$$;

alter table public."Bleachers" enable row level security;

create policy "bleachers_select" on public."Bleachers"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "bleachers_insert" on public."Bleachers"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "bleachers_update" on public."Bleachers"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

create policy "bleachers_delete" on public."Bleachers"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

-- =====================
-- 8. Helper: get current user's Users.id (UUID)
--    SECURITY DEFINER so it can read Users bypassing RLS.
-- =====================
create or replace function public.get_current_user_uuid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from "Users" u
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
  limit 1;
$$;

-- =====================
-- 9. Custom policies for Events
--    SELECT: admin + account_manager + viewer
--    INSERT: admin (any) + AM (only own — created_by_user_uuid must be self)
--    UPDATE: admin (any) + AM (only own events)
--    DELETE: admin (any) + AM (only own events)
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'Events'
  loop
    execute format('drop policy if exists %I on public."Events"', pol.policyname);
  end loop;
end;
$$;

alter table public."Events" enable row level security;

create policy "events_select" on public."Events"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "events_insert" on public."Events"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

create policy "events_update" on public."Events"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

create policy "events_delete" on public."Events"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

-- =====================
-- 10. Custom policies for BleacherEvents
--     SELECT: admin + account_manager + viewer
--     INSERT/UPDATE: admin (any) + AM (own event + own bleacher)
--     DELETE: admin (any) + AM (own event only)
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'BleacherEvents'
  loop
    execute format('drop policy if exists %I on public."BleacherEvents"', pol.policyname);
  end loop;
end;
$$;

alter table public."BleacherEvents" enable row level security;

create policy "bleacher_events_select" on public."BleacherEvents"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "bleacher_events_insert" on public."BleacherEvents"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from "Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
      and exists (
        select 1 from "Bleachers" b
        where b.id = bleacher_uuid
          and (
            b.summer_account_manager_uuid = public.get_current_account_manager_id()
            or b.winter_account_manager_uuid = public.get_current_account_manager_id()
          )
      )
    )
  );

create policy "bleacher_events_update" on public."BleacherEvents"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from "Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
      and exists (
        select 1 from "Bleachers" b
        where b.id = bleacher_uuid
          and (
            b.summer_account_manager_uuid = public.get_current_account_manager_id()
            or b.winter_account_manager_uuid = public.get_current_account_manager_id()
          )
      )
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from "Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
      and exists (
        select 1 from "Bleachers" b
        where b.id = bleacher_uuid
          and (
            b.summer_account_manager_uuid = public.get_current_account_manager_id()
            or b.winter_account_manager_uuid = public.get_current_account_manager_id()
          )
      )
    )
  );

create policy "bleacher_events_delete" on public."BleacherEvents"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from "Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
    )
  );
