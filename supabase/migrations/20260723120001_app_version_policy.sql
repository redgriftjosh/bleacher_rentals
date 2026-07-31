-- App store version gate: shared policy per environment + driver version reporting.

-- ═══════════════════════════════════════════════════════════════
-- 1. AppVersionPolicy — one row per environment (update in place)
-- ═══════════════════════════════════════════════════════════════

create table public."AppVersionPolicy" (
  id uuid not null default gen_random_uuid(),
  environment text not null,
  recommended_version text not null,
  required_version text not null,
  soft_deadline timestamp with time zone null,
  ios_store_url text not null default '',
  android_store_url text not null default '',
  message text null,
  updated_at timestamp with time zone not null default now(),
  constraint AppVersionPolicy_pkey primary key (id),
  constraint AppVersionPolicy_environment_key unique (environment),
  constraint AppVersionPolicy_environment_check check (
    environment in ('development', 'staging', 'production')
  )
) tablespace pg_default;

comment on table public."AppVersionPolicy" is
  'Store version gate policy. Exactly one row per environment; ops updates fields in place.';

alter table public."AppVersionPolicy" enable row level security;

-- Drivers (and staff) can read policy to evaluate soft/force update UI
create policy "app_version_policy_select"
  on public."AppVersionPolicy"
  as permissive for select to authenticated
  using (true);

-- Only admins change policy (via SQL / Table Editor / future admin UI)
create policy "app_version_policy_admin_write"
  on public."AppVersionPolicy"
  as permissive for all to authenticated
  using (public.get_user_roles() && '{admin}'::text[])
  with check (public.get_user_roles() && '{admin}'::text[]);

-- Seed the three fixed rows (safe defaults — no force update until ops raises versions)
insert into public."AppVersionPolicy" (
  environment,
  recommended_version,
  required_version,
  soft_deadline,
  ios_store_url,
  android_store_url,
  message
) values
  (
    'development',
    '1.0.0',
    '1.0.0',
    null,
    '',
    '',
    null
  ),
  (
    'staging',
    '1.0.0',
    '1.0.0',
    null,
    '',
    '',
    null
  ),
  (
    'production',
    '1.0.0',
    '1.0.0',
    null,
    '',
    '',
    null
  );

-- ═══════════════════════════════════════════════════════════════
-- 2. Drivers — report installed app version for ops visibility
-- ═══════════════════════════════════════════════════════════════

alter table public."Drivers"
  add column if not exists app_version text null,
  add column if not exists app_platform text null,
  add column if not exists app_version_reported_at timestamp with time zone null;

alter table public."Drivers"
  drop constraint if exists Drivers_app_platform_check;

alter table public."Drivers"
  add constraint Drivers_app_platform_check
  check (app_platform is null or app_platform in ('ios', 'android'));

comment on column public."Drivers".app_version is
  'Last reported native app version from the driver mobile app.';
comment on column public."Drivers".app_platform is
  'Last reported platform: ios or android.';
comment on column public."Drivers".app_version_reported_at is
  'When the driver app last reported app_version / app_platform.';
