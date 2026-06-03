-- =============================================================
-- Allow viewers to INSERT/UPDATE their own DashboardFilterSettings row.
--
-- Without this, a viewer's PowerSync local insert gets rejected
-- by RLS on sync, causing the row to be deleted on the next pull,
-- which triggers a re-insert loop in the client.
--
-- We add permissive policies scoped to user_uuid = self so viewers
-- can only touch their own settings row.
-- =============================================================

-- INSERT: viewer can insert their own settings row
create policy "viewer_dashboard_filter_settings_insert"
  on public."DashboardFilterSettings"
  as permissive for insert to authenticated
  with check (
    'viewer' = any(public.get_user_roles())
    and user_uuid = public.get_current_user_uuid()
  );

-- UPDATE: viewer can update their own settings row
create policy "viewer_dashboard_filter_settings_update"
  on public."DashboardFilterSettings"
  as permissive for update to authenticated
  using (
    'viewer' = any(public.get_user_roles())
    and user_uuid = public.get_current_user_uuid()
  )
  with check (
    'viewer' = any(public.get_user_roles())
    and user_uuid = public.get_current_user_uuid()
  );
