-- Add is_viewer column to Users table.
-- Viewers get read-only access to a subset of tables (e.g. Events).
alter table public."Users"
  add column is_viewer boolean not null default false;

-- Update get_user_role() to check is_viewer explicitly
-- instead of granting viewer to every authenticated user.
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when u.is_admin = true then 'admin'
      when exists (
        select 1 from "AccountManagers" am
        where am.user_uuid = u.id and am.is_active = true
      ) then 'manager'
      when exists (
        select 1 from "Developers" d
        where d.user_uuid = u.id and d.is_active = true
      ) then 'developer'
      when u.is_viewer = true then 'viewer'
      else null
    end
  from "Users" u
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
  limit 1;
$$;
