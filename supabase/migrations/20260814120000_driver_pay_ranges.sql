-- =============================================================
-- DriverPayRanges: tiered pay rates per driver. Each row is a
-- value band (min_value .. max_value) with the rate that applies
-- inside that band. A null max_value means the band is open ended
-- (the top tier).
-- =============================================================

create table public."DriverPayRanges" (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  driver_uuid uuid not null,
  min_value integer not null default 0,
  max_value integer null,
  rate numeric(10, 2) not null default 0,
  constraint driver_pay_ranges_pkey primary key (id),
  constraint driver_pay_ranges_driver_uuid_fkey
    foreign key (driver_uuid) references public."Drivers" (id) on delete cascade,
  constraint driver_pay_ranges_min_value_check check (min_value >= 0),
  constraint driver_pay_ranges_rate_check check (rate >= 0),
  constraint driver_pay_ranges_range_check check (max_value is null or max_value > min_value)
) tablespace pg_default;

create index if not exists "DriverPayRanges_driver_uuid_idx"
  on public."DriverPayRanges" using btree (driver_uuid) tablespace pg_default;

-- =====================
-- RLS: admins and account managers get full CRUD.
-- =====================
alter table public."DriverPayRanges" enable row level security;

create policy "driver_pay_ranges_select" on public."DriverPayRanges"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "driver_pay_ranges_insert" on public."DriverPayRanges"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "driver_pay_ranges_update" on public."DriverPayRanges"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  )
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "driver_pay_ranges_delete" on public."DriverPayRanges"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );
