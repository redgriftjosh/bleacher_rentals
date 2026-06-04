-- =============================================================
-- Zone Assignments Migration
--
-- 1. Add zone_uuid FK to Bleachers (many-to-one: many bleachers → one zone)
-- 2. Deprecate summer_account_manager_uuid and winter_account_manager_uuid on Bleachers
-- 3. Create AccountManagerZones junction table (many-to-many)
-- 4. Create DriverZones junction table (many-to-many)
-- 5. RLS: read for admin+AM+viewer, write for admin only
-- =============================================================

-- =====================
-- 1. Add zone_uuid to Bleachers
-- =====================
alter table public."Bleachers"
  add column if not exists zone_uuid uuid;

alter table public."Bleachers"
  add constraint "Bleachers_zone_uuid_fkey"
  foreign key (zone_uuid) references public."Zones" (id) on delete set null;

create index if not exists "Bleachers_zone_uuid_idx"
  on public."Bleachers" (zone_uuid);

-- Mark deprecated columns
comment on column public."Bleachers".summer_account_manager_uuid is 'DEPRECATED: use zone_uuid + AccountManagerZones instead';
comment on column public."Bleachers".winter_account_manager_uuid is 'DEPRECATED: use zone_uuid + AccountManagerZones instead';

-- =====================
-- 2. AccountManagerZones junction table
-- =====================
create table public."AccountManagerZones" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  account_manager_uuid uuid not null,
  zone_uuid uuid not null,
  constraint AccountManagerZones_pkey primary key (id),
  constraint AccountManagerZones_am_uuid_fkey
    foreign key (account_manager_uuid) references public."AccountManagers" (id) on delete cascade,
  constraint AccountManagerZones_zone_uuid_fkey
    foreign key (zone_uuid) references public."Zones" (id) on delete cascade,
  constraint AccountManagerZones_unique unique (account_manager_uuid, zone_uuid)
);

create index if not exists "AccountManagerZones_am_uuid_idx"
  on public."AccountManagerZones" (account_manager_uuid);
create index if not exists "AccountManagerZones_zone_uuid_idx"
  on public."AccountManagerZones" (zone_uuid);

-- =====================
-- 3. DriverZones junction table
-- =====================
create table public."DriverZones" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  driver_uuid uuid not null,
  zone_uuid uuid not null,
  constraint DriverZones_pkey primary key (id),
  constraint DriverZones_driver_uuid_fkey
    foreign key (driver_uuid) references public."Drivers" (id) on delete cascade,
  constraint DriverZones_zone_uuid_fkey
    foreign key (zone_uuid) references public."Zones" (id) on delete cascade,
  constraint DriverZones_unique unique (driver_uuid, zone_uuid)
);

create index if not exists "DriverZones_driver_uuid_idx"
  on public."DriverZones" (driver_uuid);
create index if not exists "DriverZones_zone_uuid_idx"
  on public."DriverZones" (zone_uuid);

-- =====================
-- 4. RLS for AccountManagerZones
--    SELECT: admin + account_manager + viewer
--    INSERT/UPDATE/DELETE: admin only
-- =====================
alter table public."AccountManagerZones" enable row level security;

create policy "amzones_select" on public."AccountManagerZones"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "amzones_insert" on public."AccountManagerZones"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "amzones_update" on public."AccountManagerZones"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

create policy "amzones_delete" on public."AccountManagerZones"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

-- =====================
-- 5. RLS for DriverZones
--    SELECT: admin + account_manager + viewer
--    INSERT/UPDATE/DELETE: admin only
-- =====================
alter table public."DriverZones" enable row level security;

create policy "driverzones_select" on public."DriverZones"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "driverzones_insert" on public."DriverZones"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "driverzones_update" on public."DriverZones"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

create policy "driverzones_delete" on public."DriverZones"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );
