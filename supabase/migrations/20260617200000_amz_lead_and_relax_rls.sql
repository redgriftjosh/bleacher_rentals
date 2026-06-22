-- =============================================================
-- 1. Add is_lead column to AccountManagerZones
-- 2. Relax RLS: AM can CRUD any event/worktracker/maintenance
--    regardless of bleacher ownership or created_by
-- =============================================================

-- =====================
-- 1. AccountManagerZones.is_lead
-- =====================
alter table public."AccountManagerZones"
  add column if not exists is_lead boolean not null default false;

-- =====================
-- 2. Events — relax to role-only check
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

create policy "events_select" on public."Events"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "events_insert" on public."Events"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "events_update" on public."Events"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "events_delete" on public."Events"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- =====================
-- 3. BleacherEvents — relax to role-only check
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

create policy "bleacher_events_select" on public."BleacherEvents"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "bleacher_events_insert" on public."BleacherEvents"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "bleacher_events_update" on public."BleacherEvents"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "bleacher_events_delete" on public."BleacherEvents"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- =====================
-- 4. WorkTrackers — relax to role-only check
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'WorkTrackers'
  loop
    execute format('drop policy if exists %I on public."WorkTrackers"', pol.policyname);
  end loop;
end;
$$;

create policy "worktrackers_select" on public."WorkTrackers"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "worktrackers_insert" on public."WorkTrackers"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "worktrackers_update" on public."WorkTrackers"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "worktrackers_delete" on public."WorkTrackers"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- =====================
-- 5. MaintenanceEvents — relax to role-only check
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'MaintenanceEvents'
  loop
    execute format('drop policy if exists %I on public."MaintenanceEvents"', pol.policyname);
  end loop;
end;
$$;

create policy "maint_events_select" on public."MaintenanceEvents"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "maint_events_insert" on public."MaintenanceEvents"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "maint_events_update" on public."MaintenanceEvents"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "maint_events_delete" on public."MaintenanceEvents"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- =====================
-- 6. BleacherMaintEvents — relax to role-only check
-- =====================
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'BleacherMaintEvents'
  loop
    execute format('drop policy if exists %I on public."BleacherMaintEvents"', pol.policyname);
  end loop;
end;
$$;

create policy "bleacher_maint_events_select" on public."BleacherMaintEvents"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "bleacher_maint_events_insert" on public."BleacherMaintEvents"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "bleacher_maint_events_update" on public."BleacherMaintEvents"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "bleacher_maint_events_delete" on public."BleacherMaintEvents"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );
