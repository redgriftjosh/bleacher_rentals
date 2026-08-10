-- Account managers need SELECT on QboConnections for display names when working
-- with sales offices / quotes. OAuth tokens are only used server-side (service role).

drop policy if exists "rbac_select" on public."QboConnections";

create policy "rbac_select" on public."QboConnections"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );
