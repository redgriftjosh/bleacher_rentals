-- =============================================================
-- RBAC Zero-Trust RLS Migration
--
-- Principle: everything is denied unless explicitly allowed.
-- Roles: admin > manager > developer > viewer > (none = blocked)
--
-- Users table gets a special self-read policy to avoid recursion.
-- _powersync_unhandled is excluded (Supabase internal).
-- =============================================================

-- =====================
-- 1. Helper: get_user_role()
--    SECURITY DEFINER so it can read Users bypassing RLS.
--    Returns: 'admin' | 'manager' | 'developer' | 'viewer' | NULL
-- =====================
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when u.is_admin = true then 'admin'
      when exists (
        select 1 from "AccountManagers" am
        where am.user_uuid = u.id and am.is_active = true
      ) then 'manager'
      when exists (
        select 1 from "Developers" d
        where d.user_uuid = u.id and d.is_active = true
      ) then 'developer'
      when u.clerk_user_id is not null then 'viewer'
      else null
    end
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

  manager_tables text[] := array[
    'Addresses',
    'Alerts',
    'BleacherEvents',
    'BleacherMaintEvents',
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
    'Events',
    'HomeBases',
    'InspectionPhotos',
    'InspectionQuestions',
    'MaintenanceEvents',
    'MaintenancePhotos',
    'Notifications',
    'QboConnections',
    'ScorecardTargets',
    'Tasks',
    'UserAlerts',
    'UserHomeBases',
    'UserRoles',
    'UserStatuses',
    'Vehicles',
    'Vendors',
    'WorkTrackerGroups',
    'WorkTrackerInspections',
    'WorkTrackers',
    'WorkTrackerTypeQboAccounts',
    'WorkTrackerTypes',
    'AccountManagers'
  ];

  viewer_tables text[] := array[
    'Addresses',
    'Alerts',
    'BleacherEvents',
    'BleacherUsers',
    'Bleachers',
    'Blocks',
    'DashboardFilterSettings',
    'Events',
    'HomeBases',
    'Notifications',
    'Tasks',
    'UserAlerts',
    'UserRoles',
    'UserStatuses',
    'WorkTrackers',
    'WorkTrackerGroups'
  ];

  skip_tables text[] := array[
    'Users',
    '_powersync_unhandled'
  ];

  is_dev boolean;
  is_mgr boolean;
  is_vwr boolean;
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

    is_dev := tbl = any(developer_tables);
    is_mgr := tbl = any(manager_tables);
    is_vwr := tbl = any(viewer_tables);

    -- SELECT
    execute format(
      $p$create policy "rbac_select" on public.%I
         as permissive for select to authenticated
         using (
           case public.get_user_role()
             when 'admin' then true
             when 'manager' then %s
             when 'developer' then %s
             when 'viewer' then %s
             else false
           end
         )$p$,
      tbl, is_mgr::text, is_dev::text, is_vwr::text
    );

    -- INSERT
    execute format(
      $p$create policy "rbac_insert" on public.%I
         as permissive for insert to authenticated
         with check (
           case public.get_user_role()
             when 'admin' then true
             when 'manager' then %s
             when 'developer' then %s
             else false
           end
         )$p$,
      tbl, is_mgr::text, is_dev::text
    );

    -- UPDATE
    execute format(
      $p$create policy "rbac_update" on public.%I
         as permissive for update to authenticated
         using (
           case public.get_user_role()
             when 'admin' then true
             when 'manager' then %s
             when 'developer' then %s
             else false
           end
         )$p$,
      tbl, is_mgr::text, is_dev::text
    );

    -- DELETE
    execute format(
      $p$create policy "rbac_delete" on public.%I
         as permissive for delete to authenticated
         using (
           case public.get_user_role()
             when 'admin' then true
             when 'manager' then %s
             when 'developer' then %s
             else false
           end
         )$p$,
      tbl, is_mgr::text, is_dev::text
    );

  end loop;
end;
$$;

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
  );

create policy "users_insert" on public."Users"
  as permissive for insert to authenticated
  with check (
    public.is_current_user_admin()
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
