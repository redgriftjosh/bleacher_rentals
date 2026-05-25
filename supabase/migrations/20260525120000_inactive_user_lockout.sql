-- =============================================================
-- Inactive User Lockout
--
-- If a user's status_uuid = '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5'
-- (inactive), they are denied ALL access regardless of roles.
--
-- Exception: inactive users can still SELECT their own Users row
-- so the app can detect the deactivated state and show a message.
--
-- Implementation: modify all SECURITY DEFINER helper functions
-- to return empty/false/null for inactive users. Since every
-- RLS policy flows through these helpers, this is the single
-- enforcement point.
--
-- Note: Users.status_uuid is nullable. We use IS DISTINCT FROM
-- so that NULL status_uuid is treated as "not inactive" (active).
-- =============================================================

-- =====================
-- 1. Helper: is_current_user_active()
-- =====================
create or replace function public.is_current_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select status_uuid is distinct from '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5'
      from "Users"
      where clerk_user_id = (auth.jwt() ->> 'sub')
      limit 1
    ),
    false
  );
$$;

-- =====================
-- 2. Modify get_user_roles() — return empty array for inactive users
-- =====================
create or replace function public.get_user_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when u.status_uuid = '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5' then '{}'::text[]
    else coalesce(
      (
        select array_agg(role) from (
          select 'admin' as role
            where u.is_admin = true
          union all
          select 'account_manager'
            where exists (
              select 1 from "AccountManagers" am
              where am.user_uuid = u.id and am.is_active = true
            )
          union all
          select 'developer'
            where exists (
              select 1 from "Developers" d
              where d.user_uuid = u.id and d.is_active = true
            )
          union all
          select 'viewer'
            where u.is_viewer = true
        ) roles
      ),
      '{}'::text[]
    )
  end
  from "Users" u
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
  limit 1;
$$;

-- =====================
-- 3. Modify is_current_user_admin() — false for inactive
-- =====================
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin
     from "Users"
     where clerk_user_id = (auth.jwt() ->> 'sub')
       and (status_uuid is distinct from '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5')
     limit 1),
    false
  );
$$;

-- =====================
-- 4. Modify is_current_user_account_manager() — false for inactive
-- =====================
create or replace function public.is_current_user_account_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from "AccountManagers" am
    join "Users" u on u.id = am.user_uuid
    where u.clerk_user_id = (auth.jwt() ->> 'sub')
      and (u.status_uuid is distinct from '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5')
      and am.is_active = true
  );
$$;

-- =====================
-- 5. Modify get_current_account_manager_id() — null for inactive
-- =====================
create or replace function public.get_current_account_manager_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select am.id
  from "AccountManagers" am
  join "Users" u on u.id = am.user_uuid
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
    and (u.status_uuid is distinct from '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5')
    and am.is_active = true
  limit 1;
$$;

-- =====================
-- 6. Modify get_current_user_uuid() — null for inactive
-- =====================
create or replace function public.get_current_user_uuid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from "Users" u
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
    and (u.status_uuid is distinct from '7b65d5a1-8ee0-4b7a-816d-d3ec1ed123c5')
  limit 1;
$$;
