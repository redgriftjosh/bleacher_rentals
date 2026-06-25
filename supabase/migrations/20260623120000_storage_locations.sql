-- =============================================================
-- StorageLocations: admin-maintained list of bleacher storage
-- sites. Linked to Bleachers via Bleachers.storage_location_uuid.
-- Displayed (first 15 chars of name) on the dashboard BleacherCell.
-- =============================================================

create table public."StorageLocations" (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  address_uuid uuid null,
  contact_phone_number text null,
  gate_code text null,
  notes text null,
  deleted boolean not null default false,
  constraint storage_locations_pkey primary key (id),
  constraint storage_locations_address_uuid_fkey
    foreign key (address_uuid) references public."Addresses" (id) on delete set null
) tablespace pg_default;

create index if not exists "StorageLocations_address_uuid_idx"
  on public."StorageLocations" using btree (address_uuid) tablespace pg_default;

-- Link Bleachers to a storage location
alter table public."Bleachers"
  add column if not exists storage_location_uuid uuid null
    references public."StorageLocations" (id) on delete set null;

create index if not exists "Bleachers_storage_location_uuid_idx"
  on public."Bleachers" using btree (storage_location_uuid) tablespace pg_default;

-- =====================
-- RLS: everyone authenticated can read (dashboard needs it),
-- only admins can create/update/delete.
-- =====================
alter table public."StorageLocations" enable row level security;

create policy "storage_locations_select" on public."StorageLocations"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "storage_locations_insert" on public."StorageLocations"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin}'::text[]
  );

create policy "storage_locations_update" on public."StorageLocations"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin}'::text[]
  )
  with check (
    public.get_user_roles() && '{admin}'::text[]
  );

create policy "storage_locations_delete" on public."StorageLocations"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin}'::text[]
  );
