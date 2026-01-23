create table public."DashboardFilterSettings" (
  id uuid not null default gen_random_uuid () primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One settings row per app user
  user_uuid uuid not null unique
    references public."Users"(id)
    on delete cascade,

  -- Persisted dashboard option state
  y_axis text not null default 'Bleachers',

  -- Stored as JSON strings for easy local-first writes
  summer_home_base_uuids text not null default '[]',
  winter_home_base_uuids text not null default '[]',
  rows text not null default '[]',
  state_provinces text not null default '[]',

  only_show_my_events boolean not null default true,
  optimization_mode boolean not null default false,

  -- null means "All Bleachers"
  season text null,

  -- Only applicable when season is SUMMER/WINTER
  account_manager_uuid uuid null
    references public."AccountManagers"(id)
    on delete set null,

  -- quick toggle: 10, 15, or null (All)
  rows_quick_filter integer null,

  constraint dashboard_filter_settings_season_check
    check (season is null or season in ('SUMMER', 'WINTER')),

  constraint dashboard_filter_settings_rows_quick_filter_check
    check (rows_quick_filter is null or rows_quick_filter in (10, 15))
);

create index dashboard_filter_settings_user_uuid_idx
  on public."DashboardFilterSettings"(user_uuid);

create index dashboard_filter_settings_account_manager_uuid_idx
  on public."DashboardFilterSettings"(account_manager_uuid);

-- Keep updated_at fresh
create or replace function public.touch_dashboard_filter_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dashboard_filter_settings_touch_updated_at on public."DashboardFilterSettings";
create trigger dashboard_filter_settings_touch_updated_at
before update on public."DashboardFilterSettings"
for each row
execute function public.touch_dashboard_filter_settings_updated_at();

alter table public."DashboardFilterSettings" enable row level security;

create policy "Allow All for Auth"
  on public."DashboardFilterSettings"
  as permissive
  for all
  to authenticated
  using (true);


-- =============================================================================
-- TaskTypes/TaskStatuses -> Postgres enum types (no backwards compatibility)
-- =============================================================================

-- Custom enum types (snake_case)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_type') then
    create type public.task_type as enum ('feature', 'bug');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum (
      'in_progress',
      'backlog',
      'complete',
      'approved',
      'in_staging',
      'paused'
    );
  end if;
end $$;

-- Add new columns
alter table public."Tasks"
  add column if not exists type public.task_type,
  add column if not exists status public.task_status;

-- Backfill from the existing lookup tables
update public."Tasks" t
set type = case tt.label
  when 'Feature' then 'feature'::public.task_type
  when 'Bug' then 'bug'::public.task_type
  else null
end
from public."TaskTypes" tt
where t.task_type_uuid = tt.id;

update public."Tasks" t
set status = case ts.label
  when 'In Progress' then 'in_progress'::public.task_status
  when 'Backlog' then 'backlog'::public.task_status
  when 'Complete' then 'complete'::public.task_status
  when 'Approved' then 'approved'::public.task_status
  when 'In Staging' then 'in_staging'::public.task_status
  when 'Paused' then 'paused'::public.task_status
  else null
end
from public."TaskStatuses" ts
where t.task_status_uuid = ts.id;

-- Drop old FK constraints + indexes + columns
alter table public."Tasks" drop constraint if exists "Tasks_task_status_uuid_fkey";
alter table public."Tasks" drop constraint if exists "Tasks_task_type_uuid_fkey";

drop index if exists public."Tasks_task_status_uuid_idx";
drop index if exists public."Tasks_task_type_uuid_idx";

alter table public."Tasks"
  drop column if exists task_status_uuid,
  drop column if exists task_type_uuid;

-- Drop old lookup tables
-- (Tasks no longer references them; you requested no backwards compatibility.)
drop table if exists public."TaskStatuses";
drop table if exists public."TaskTypes";
