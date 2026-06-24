-- =============================================================
-- Restore driver self-service on WorkTrackers.
--
-- The 20260617200000 relax migration recreated all WorkTrackers
-- policies as role-only (admin, account_manager), which dropped
-- the driver clauses that 20260603120000 had added. This restores:
--   SELECT: driver can read their own rows  (driver_uuid = self)
--   UPDATE: driver can update their own rows (driver_uuid = self),
--           WITH CHECK keeps the row theirs (can't reassign away).
--
-- AM (role-only) and admin access from 20260617200000 are preserved.
-- INSERT and DELETE are left unchanged (drivers cannot insert/delete).
--
-- Relies on public.get_current_driver_id() created in 20260603120000.
-- =============================================================

-- ── SELECT: admin + AM + viewer (all rows) + driver (own rows only)
drop policy if exists "worktrackers_select" on public."WorkTrackers";
create policy "worktrackers_select" on public."WorkTrackers"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
    or (
      public.get_current_driver_id() is not null
      and driver_uuid = public.get_current_driver_id()
    )
  );

-- ── UPDATE: admin + AM (role-only) + driver (own rows only)
drop policy if exists "worktrackers_update" on public."WorkTrackers";
create policy "worktrackers_update" on public."WorkTrackers"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
    or (
      public.get_current_driver_id() is not null
      and driver_uuid = public.get_current_driver_id()
    )
  )
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
    or (
      public.get_current_driver_id() is not null
      and driver_uuid = public.get_current_driver_id()
    )
  );
