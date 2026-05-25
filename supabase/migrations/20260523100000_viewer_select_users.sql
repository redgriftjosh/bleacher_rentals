-- =============================================================
-- Allow viewers to SELECT Users, Drivers, and AccountManagers
-- (read-only access to team member info)
--
-- Previously these tables only allowed admin + account_manager SELECT.
-- Viewers need to see:
--   - Users: team member names (event owners, work tracker drivers, etc.)
--   - Drivers: driver info in work tracker modals and dashboard cells
--   - AccountManagers: team page account manager listings
--
-- Viewers still cannot INSERT/UPDATE/DELETE any of these tables.
-- =============================================================

-- ── Users ──
drop policy if exists "users_select" on public."Users";

create policy "users_select" on public."Users"
  as permissive for select to authenticated
  using (
    clerk_user_id = (auth.jwt() ->> 'sub')
    or public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- ── Drivers ──
drop policy if exists "drivers_select" on public."Drivers";

create policy "drivers_select" on public."Drivers"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- ── AccountManagers ──
-- AccountManagers used the generic rbac_select policy from the loop
drop policy if exists "rbac_select" on public."AccountManagers";

create policy "rbac_select" on public."AccountManagers"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- ── UserHomeBases ──
-- Viewer needs to see team member home bases on the team page
drop policy if exists "rbac_select" on public."UserHomeBases";

create policy "rbac_select" on public."UserHomeBases"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );
