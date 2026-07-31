-- Allow account managers to manage DriverZones for zones they are assigned to.

create or replace function public.user_can_manage_zone(p_zone_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    'admin' = any(public.get_user_roles())
    or exists (
      select 1
      from public."AccountManagerZones" amz
      inner join public."AccountManagers" am on am.id = amz.account_manager_uuid
      where amz.zone_uuid = p_zone_uuid
        and am.user_uuid = public.get_current_user_uuid()
        and am.is_active = true
    );
$$;

drop policy if exists "driverzones_insert" on public."DriverZones";
drop policy if exists "driverzones_update" on public."DriverZones";
drop policy if exists "driverzones_delete" on public."DriverZones";

create policy "driverzones_insert" on public."DriverZones"
  as permissive for insert to authenticated
  with check (
    public.user_can_manage_zone(zone_uuid)
  );

create policy "driverzones_update" on public."DriverZones"
  as permissive for update to authenticated
  using (
    public.user_can_manage_zone(zone_uuid)
  )
  with check (
    public.user_can_manage_zone(zone_uuid)
  );

create policy "driverzones_delete" on public."DriverZones"
  as permissive for delete to authenticated
  using (
    public.user_can_manage_zone(zone_uuid)
  );
