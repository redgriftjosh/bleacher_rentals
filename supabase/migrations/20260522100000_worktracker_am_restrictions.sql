-- =============================================================
-- WorkTrackers: AM ownership restrictions
--
-- 1. Add created_by_user_uuid column (auto-set via DEFAULT)
-- 2. Custom RLS policies:
--    SELECT: admin + account_manager + viewer (all can view all)
--    INSERT: admin (any) + AM (created_by = self, bleacher = own, driver = own or null)
--    UPDATE: USING — AM can access if created_by = self OR driver assigned to AM
--            WITH CHECK — new values must have own bleacher + own driver
--    DELETE: admin (any) + AM (created_by = self OR driver assigned to AM)
-- =============================================================

-- =====================
-- 1. Schema change: add created_by_user_uuid with auto-default
-- =====================
alter table public."WorkTrackers"
  add column if not exists created_by_user_uuid uuid references "Users"(id)
  default public.get_current_user_uuid();

-- =====================
-- 2. Custom RLS policies for WorkTrackers
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

alter table public."WorkTrackers" enable row level security;

-- SELECT: everyone can see all work trackers
create policy "worktrackers_select" on public."WorkTrackers"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- INSERT: admin without restrictions; AM must set created_by = self, bleacher must be own, driver must be own or null
create policy "worktrackers_insert" on public."WorkTrackers"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
      and exists (
        select 1 from "Bleachers" b
        where b.id = bleacher_uuid
          and (
            b.summer_account_manager_uuid = public.get_current_account_manager_id()
            or b.winter_account_manager_uuid = public.get_current_account_manager_id()
          )
      )
      and (
        driver_uuid is null
        or exists (
          select 1 from "Drivers" d
          where d.id = driver_uuid
            and d.account_manager_uuid = public.get_current_account_manager_id()
        )
      )
    )
  );

-- UPDATE:
--   USING: which rows AM can access (created_by = self OR driver assigned to AM)
--   WITH CHECK: new values must have own bleacher + own driver (no created_by check —
--               AM may update a WT created by admin if the driver is assigned to them)
create policy "worktrackers_update" on public."WorkTrackers"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and (
        created_by_user_uuid = public.get_current_user_uuid()
        or exists (
          select 1 from "Drivers" d
          where d.id = driver_uuid
            and d.account_manager_uuid = public.get_current_account_manager_id()
        )
      )
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from "Bleachers" b
        where b.id = bleacher_uuid
          and (
            b.summer_account_manager_uuid = public.get_current_account_manager_id()
            or b.winter_account_manager_uuid = public.get_current_account_manager_id()
          )
      )
      and (
        driver_uuid is null
        or exists (
          select 1 from "Drivers" d
          where d.id = driver_uuid
            and d.account_manager_uuid = public.get_current_account_manager_id()
        )
      )
    )
  );

-- DELETE: admin without restrictions; AM can delete if created_by = self OR driver assigned to AM
create policy "worktrackers_delete" on public."WorkTrackers"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and (
        created_by_user_uuid = public.get_current_user_uuid()
        or exists (
          select 1 from "Drivers" d
          where d.id = driver_uuid
            and d.account_manager_uuid = public.get_current_account_manager_id()
        )
      )
    )
  );
