-- Allow account managers to update a driver they share a zone with, independent of the
-- deprecated Drivers.account_manager_uuid column. The legacy owner/null clauses are kept
-- for backwards compatibility so nothing that currently works breaks.

create or replace function public.user_shares_zone_with_driver(p_driver_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."DriverZones" dz
    inner join public."AccountManagerZones" amz on amz.zone_uuid = dz.zone_uuid
    inner join public."AccountManagers" am on am.id = amz.account_manager_uuid
    where dz.driver_uuid = p_driver_uuid
      and am.user_uuid = public.get_current_user_uuid()
      and am.is_active = true
  );
$$;

drop policy if exists "drivers_update" on public."Drivers";

create policy "drivers_update" on public."Drivers"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and (
        account_manager_uuid is null
        or account_manager_uuid = public.get_current_account_manager_id()
        or public.user_shares_zone_with_driver(id)
      )
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and (
        account_manager_uuid is null
        or account_manager_uuid = public.get_current_account_manager_id()
        or public.user_shares_zone_with_driver(id)
      )
    )
  );
