-- =============================================================
-- WorkTrackers RLS overhaul
--
-- 1. Create get_current_driver_id() helper
-- 2. Simplify AM rules: full CRUD if the WorkTracker's bleacher
--    has this AM as summer_account_manager_uuid OR
--    winter_account_manager_uuid.
-- 3. Driver self-service: SELECT + UPDATE own rows only.
-- 4. Admin: unrestricted CRUD (unchanged).
-- =============================================================

-- =====================
-- 1. Helper: get_current_driver_id()
-- =====================
create or replace function public.get_current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from "Drivers" d
  join "Users" u on u.id = d.user_uuid
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
    and (u.status_uuid is distinct from '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5')
    and d.is_active = true
  limit 1;
$$;

-- =====================
-- 2. Replace WorkTrackers policies (drop + recreate)
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

-- ── Helper expression (used in every AM clause below):
-- "This WT's bleacher belongs to the current AM"
--
--   exists (
--     select 1 from "Bleachers" b
--     where b.id = bleacher_uuid
--       and (
--         b.summer_account_manager_uuid = public.get_current_account_manager_id()
--         or b.winter_account_manager_uuid = public.get_current_account_manager_id()
--       )
--   )

-- SELECT: admin + AM + viewer (all rows) + driver (own rows only)
create policy "worktrackers_select" on public."WorkTrackers"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
    or (
      public.get_current_driver_id() is not null
      and driver_uuid = public.get_current_driver_id()
    )
  );

-- INSERT: admin (any) + AM (bleacher must be own)
create policy "worktrackers_insert" on public."WorkTrackers"
  as permissive for insert to authenticated
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
    )
  );

-- UPDATE:
--   USING:       admin (any) + AM (bleacher is own) + driver (own rows)
--   WITH CHECK:  admin (any) + AM (bleacher is own) + driver (own rows)
create policy "worktrackers_update" on public."WorkTrackers"
  as permissive for update to authenticated
  using (
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
    )
    or (
      public.get_current_driver_id() is not null
      and driver_uuid = public.get_current_driver_id()
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
    )
    or (
      public.get_current_driver_id() is not null
      and driver_uuid = public.get_current_driver_id()
    )
  );

-- DELETE: admin (any) + AM (bleacher is own) — drivers cannot delete
create policy "worktrackers_delete" on public."WorkTrackers"
  as permissive for delete to authenticated
  using (
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
    )
  );
