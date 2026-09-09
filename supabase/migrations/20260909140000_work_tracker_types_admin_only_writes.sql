-- ============================================================================
-- WorkTrackerTypes / WorkTrackerTypeQboAccounts: writes are admin-only.
--
-- Both tables got blanket admin+account_manager read/write from the generic
-- RBAC loop in 20260513153019_role_accessibility_policy.sql, back when any
-- account manager could open the old EditWorkTrackerTypesModal and add,
-- rename, delete a type, or reassign its QuickBooks account. That modal is
-- gone — /work-tracker-types (Configuration) is the only place either table
-- is written from, and it's admin-only in the web app (accessConfig.ts,
-- permissionPageData.ts). This migration makes the database agree.
--
-- SELECT stays admin+account_manager on both: the work tracker Type dropdown
-- (any account manager editing a tracker) reads WorkTrackerTypes, and
-- /api/quickbooks/create-bill (open to account managers, not just admin)
-- reads WorkTrackerTypeQboAccounts to build the bill. Only the write
-- policies narrow.
-- ============================================================================

drop policy if exists "rbac_insert" on public."WorkTrackerTypes";
drop policy if exists "rbac_update" on public."WorkTrackerTypes";
drop policy if exists "rbac_delete" on public."WorkTrackerTypes";

create policy "rbac_insert" on public."WorkTrackerTypes"
  as permissive for insert to authenticated
  with check (public.get_user_roles() && array['admin']::text[]);

create policy "rbac_update" on public."WorkTrackerTypes"
  as permissive for update to authenticated
  using (public.get_user_roles() && array['admin']::text[]);

create policy "rbac_delete" on public."WorkTrackerTypes"
  as permissive for delete to authenticated
  using (public.get_user_roles() && array['admin']::text[]);

drop policy if exists "rbac_insert" on public."WorkTrackerTypeQboAccounts";
drop policy if exists "rbac_update" on public."WorkTrackerTypeQboAccounts";
drop policy if exists "rbac_delete" on public."WorkTrackerTypeQboAccounts";

create policy "rbac_insert" on public."WorkTrackerTypeQboAccounts"
  as permissive for insert to authenticated
  with check (public.get_user_roles() && array['admin']::text[]);

create policy "rbac_update" on public."WorkTrackerTypeQboAccounts"
  as permissive for update to authenticated
  using (public.get_user_roles() && array['admin']::text[]);

create policy "rbac_delete" on public."WorkTrackerTypeQboAccounts"
  as permissive for delete to authenticated
  using (public.get_user_roles() && array['admin']::text[]);
