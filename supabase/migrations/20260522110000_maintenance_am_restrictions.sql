-- =============================================================
-- MaintenanceEvents + BleacherMaintEvents: AM ownership restrictions
--
-- MaintenanceEvents:
--   SELECT: admin + AM + viewer
--   INSERT: admin (any) + AM (created_by = self, auto-default)
--   UPDATE/DELETE: admin (any) + AM (only own — created_by = self)
--
-- BleacherMaintEvents (same pattern as BleacherEvents):
--   SELECT: admin + AM + viewer
--   INSERT/UPDATE: admin (any) + AM (own bleacher + own maintenance event)
--   DELETE: admin (any) + AM (own maintenance event)
-- =============================================================

-- =====================
-- 1. Custom RLS policies for MaintenanceEvents
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

alter table public."MaintenanceEvents" enable row level security;

-- Set default so created_by_user_uuid is auto-populated
alter table public."MaintenanceEvents"
  alter column created_by_user_uuid set default public.get_current_user_uuid();

create policy "maint_events_select" on public."MaintenanceEvents"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "maint_events_insert" on public."MaintenanceEvents"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

create policy "maint_events_update" on public."MaintenanceEvents"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

create policy "maint_events_delete" on public."MaintenanceEvents"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

-- =====================
-- 2. Custom RLS policies for BleacherMaintEvents
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

alter table public."BleacherMaintEvents" enable row level security;

create policy "bleacher_maint_events_select" on public."BleacherMaintEvents"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- INSERT: admin any; AM must own the maintenance event AND the bleacher
create policy "bleacher_maint_events_insert" on public."BleacherMaintEvents"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from "MaintenanceEvents" me
        where me.id = maintenance_event_uuid
          and me.created_by_user_uuid = public.get_current_user_uuid()
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

-- UPDATE: admin any; AM must own the maintenance event AND the bleacher
create policy "bleacher_maint_events_update" on public."BleacherMaintEvents"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from "MaintenanceEvents" me
        where me.id = maintenance_event_uuid
          and me.created_by_user_uuid = public.get_current_user_uuid()
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

-- DELETE: admin any; AM only needs to own the maintenance event
create policy "bleacher_maint_events_delete" on public."BleacherMaintEvents"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from "MaintenanceEvents" me
        where me.id = maintenance_event_uuid
          and me.created_by_user_uuid = public.get_current_user_uuid()
      )
    )
  );
