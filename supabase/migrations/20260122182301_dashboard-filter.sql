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
