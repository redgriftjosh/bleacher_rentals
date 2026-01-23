create table public."WorkTrackerInspections" (
  id uuid not null default gen_random_uuid () primary key,
  created_at timestamptz not null default now(),
  walk_around_complete boolean not null default false,
  issues_found boolean not null default false,
  issue_description text
);

alter table public."WorkTrackerInspections" enable row level security;

create policy "Allow All for Auth"
  on public."WorkTrackerInspections"
  as permissive
  for all
  to authenticated
using (true);

create table public."InspectionPhotos" (
  id uuid not null default gen_random_uuid () primary key,
  created_at timestamptz not null default now(),

  inspection_uuid uuid not null
    references public."WorkTrackerInspections"(id)
    on delete cascade,

  storage_path text not null,  -- e.g. 'inspections/123/pre/456.jpg'
  caption text
);

alter table public."InspectionPhotos" enable row level security;

create policy "Allow All for Auth"
  on public."InspectionPhotos"
  as permissive
  for all
  to authenticated
using (true);

create type worktracker_status as enum (
  'draft',        -- created by account manager, not visible to driver
  'released',     -- visible to driver, waiting for accept
  'accepted',     -- driver has accepted, not started yet
  'dest_pickup',  -- en route to pickup location
  'pickup_inspection', -- performing pre-trip inspection
  'dest_dropoff', -- en route to dropoff location
  'dropoff_inspection', -- performing post-trip inspection
  'completed',    -- post-trip done
  'cancelled'     -- optional
);

alter table public."WorkTrackers"
  add column status worktracker_status not null default 'draft',
  add column released_at timestamptz,
  add column accepted_at timestamptz,
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column updated_at timestamptz not null default now(),
  add column pre_inspection_uuid uuid references public."WorkTrackerInspections"(id) on delete set null,
  add column post_inspection_uuid uuid references public."WorkTrackerInspections"(id) on delete set null;

-- Function to keep status timestamps in sync on WorkTrackers
create or replace function public.set_worktracker_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  -- Always keep updated_at fresh on any change
  new.updated_at := now();

  -- Handle INSERT: no OLD row, so just set based on initial status
  if tg_op = 'INSERT' then
    if new.status = 'released' and new.released_at is null then
      new.released_at := now();
    end if;

    if new.status = 'accepted' and new.accepted_at is null then
      new.released_at := now();
    end if;

    if new.status = 'dest_pickup' and new.started_at is null then
      new.started_at := now();
    end if;

    if new.status = 'completed' and new.completed_at is null then
      new.completed_at := now();
    end if;

    return new;
  end if;

  -- Handle UPDATE: only react when status actually changes
  if new.status is distinct from old.status then

    if new.status = 'released' and new.released_at is null then
      new.released_at := now();
    end if;

    if new.status = 'accepted' and new.accepted_at is null then
      new.accepted_at := now();
    end if;

    if new.status = 'dest_pickup' and new.started_at is null then
      new.started_at := now();
    end if;

    if new.status = 'completed' and new.completed_at is null then
      new.completed_at := now();
    end if;

    -- We *don’t* clear timestamps if you move backwards
    -- (e.g. completed -> cancelled). You can still override manually
    -- by explicitly setting the *_at fields in an UPDATE.
  end if;

  return new;
end;
$$;

-- Attach the trigger to WorkTrackers
create trigger set_worktracker_status_timestamps
before insert or update
on public."WorkTrackers"
for each row
execute function public.set_worktracker_status_timestamps();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,  -- Make bucket public so photos can be viewed
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the bucket
-- Allow authenticated users to upload photos
CREATE POLICY "Allow All for Auth"
ON storage.objects 
as permissive
FOR all
TO authenticated
using (true);

create table public."Vehicles" (
  id uuid not null default gen_random_uuid () primary key,
  created_at timestamptz not null default now(),
  make text not null,
  model text not null,
  year smallint not null,
  vin_number text
);

alter table public."Drivers"
  add column phone_number text,
  add column address_uuid uuid references public."Addresses"(id) on delete set null,
  add column license_photo_path text,
  add column insurance_photo_path text,
  add column medical_card_photo_path text,
  add column vehicle_uuid uuid references public."Vehicles"(id) on delete set null;
alter table public."Vehicles" enable row level security;

create policy "Allow All for Auth"
  on public."Vehicles"
  as permissive
  for all
  to authenticated
using (true);

-- Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  true,  -- Private bucket, only authenticated users can access
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;
