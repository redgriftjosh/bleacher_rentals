create table public."QboConnections" (
  id uuid not null default gen_random_uuid (),
  display_name text not null,
  encrypted_token_value text not null,
  realm_id text,
  qbo_tax_code_id text,
  constraint QboConnections_pkey primary key (id),
  constraint QboConnections_realm_id_unique unique (realm_id)
);

alter table public."QboConnections" enable row level security;

create policy "Allow All for Auth"
	on public."QboConnections"
	as permissive
	for all
	to authenticated
using (true)
with check (true);

create table public."Vendors" (
	id uuid not null default gen_random_uuid (),
	created_at timestamp with time zone not null default now(),
	qbo_vendor_id text,
	qbo_connection_uuid uuid,
	display_name text not null,
	is_active boolean not null default true,
	logo_url text,
	ein text constraint ein_must_be_9_digits check (ein ~ '^\d{9}$'),
  hst text constraint hst_formatting check (hst ~ '^\d{9}[A-Z]{2}\d{4}$'), -- must be 9 digits, then two letters, then 4 digits
	constraint Vendors_pkey primary key (id),
	constraint Vendors_qbo_connection_uuid_fkey foreign key (qbo_connection_uuid) references public."QboConnections" (id) on delete restrict
);

alter table public."Vendors" enable row level security;

comment on column public."Vendors".ein is 'Employer Identification Number only for US-based vendors, must be 9 digits if provided';
comment on column public."Vendors".hst is 'Harmonized Sales Tax number only for Canadian vendors, must be 9 digits, then two uppercase letters, then 4 digits if provided';

create policy "Allow All for Auth"
	on public."Vendors"
	as permissive
	for all
	to authenticated
using (true)
with check (true);


alter table public."Drivers"
	add column vendor_uuid uuid,
	add constraint Drivers_vendor_uuid_fkey foreign key (vendor_uuid) references public."Vendors" (id) on delete set null;

create index if not exists "Drivers_vendor_uuid_idx"
on public."Drivers" using btree (vendor_uuid);

-- Create vendor-logos storage bucket
insert into storage.buckets (id, name, public)
values ('vendor-logos', 'vendor-logos', true)
on conflict (id) do nothing;

-- Storage policies for vendor-logos
create policy "Allow authenticated users to upload vendor logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'vendor-logos');

create policy "Allow authenticated users to update vendor logos"
on storage.objects for update
to authenticated
using (bucket_id = 'vendor-logos');

create policy "Allow authenticated users to delete vendor logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'vendor-logos');

create policy "Allow public read access to vendor logos"
on storage.objects for select
to public
using (bucket_id = 'vendor-logos');

-- Create status enum for WorkTrackerGroups
create type public.worktracker_group_status as enum (
  'draft',
  'qbo_bill_creating',
  'qbo_bill_created',
  'qbo_bill_error',
  'no_bill_ready_for_payment'
);

-- Create WorkTrackerGroups table
create table public."WorkTrackerGroups" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  week_start date not null,
  week_end date not null,
  driver_uuid uuid not null,
  qbo_bill_id text,
  status public.worktracker_group_status not null default 'draft',
  constraint WorkTrackerGroups_pkey primary key (id),
  constraint WorkTrackerGroups_driver_uuid_fkey foreign key (driver_uuid) references public."Drivers" (id) on delete cascade,
  constraint week_start_is_monday check (extract(dow from week_start) = 1),
  constraint week_end_is_sunday check (extract(dow from week_end) = 0),
  constraint week_end_after_start check (week_end > week_start),
  constraint unique_driver_week unique (driver_uuid, week_start)
);

create index if not exists "WorkTrackerGroups_driver_uuid_idx" on public."WorkTrackerGroups" using btree (driver_uuid);
create index if not exists "WorkTrackerGroups_week_start_idx" on public."WorkTrackerGroups" using btree (week_start);
create index if not exists "WorkTrackerGroups_status_idx" on public."WorkTrackerGroups" using btree (status);

alter table public."WorkTrackerGroups" enable row level security;

create policy "Allow All for Auth"
  on public."WorkTrackerGroups"
  as permissive
  for all
  to authenticated
using (true)
with check (true);

-- Add worktracker_group_uuid to WorkTrackers table
alter table public."WorkTrackers"
  add column worktracker_group_uuid uuid,
  add constraint WorkTrackers_worktracker_group_uuid_fkey foreign key (worktracker_group_uuid) references public."WorkTrackerGroups" (id) on delete restrict;

create index if not exists "WorkTrackers_worktracker_group_uuid_idx" on public."WorkTrackers" using btree (worktracker_group_uuid);

-- Function to get the Monday of a given week
create or replace function get_week_start(input_date date) returns date as $$
begin
  return input_date - ((extract(dow from input_date)::integer + 6) % 7);
end;
$$ language plpgsql immutable;

-- Function to get the Sunday of a given week
create or replace function get_week_end(input_date date) returns date as $$
begin
  return (input_date - ((extract(dow from input_date)::integer + 6) % 7)) + 6;
end;
$$ language plpgsql immutable;

-- Trigger function to validate WorkTracker group constraints
create or replace function validate_worktracker_group()
returns trigger as $$
declare
  v_group_driver_uuid uuid;
  v_group_week_start date;
  v_group_week_end date;
begin
  -- Only validate if worktracker_group_uuid is set
  if NEW.worktracker_group_uuid is null then
    return NEW;
  end if;

  -- Get group details
  select driver_uuid, week_start, week_end
  into v_group_driver_uuid, v_group_week_start, v_group_week_end
  from public."WorkTrackerGroups"
  where id = NEW.worktracker_group_uuid;

  -- Check if group exists
  if not found then
    raise exception 'WorkTrackerGroup with id % does not exist', NEW.worktracker_group_uuid;
  end if;

  -- Validate driver matches
  if NEW.driver_uuid is not null and NEW.driver_uuid != v_group_driver_uuid then
    raise exception 'WorkTracker driver_uuid (%) must match WorkTrackerGroup driver_uuid (%)', 
      NEW.driver_uuid, v_group_driver_uuid;
  end if;

  -- Validate date is within week range
  if NEW.date is not null and (NEW.date < v_group_week_start or NEW.date > v_group_week_end) then
    raise exception 'WorkTracker date (%) must be within group week range (% to %)', 
      NEW.date, v_group_week_start, v_group_week_end;
  end if;

  return NEW;
end;
$$ language plpgsql;

-- Create validation trigger (runs after assignment trigger)
create trigger validate_worktracker_group_trigger
  before insert or update of worktracker_group_uuid, driver_uuid, date
  on public."WorkTrackers"
  for each row
  execute function validate_worktracker_group();

-- Trigger function to auto-assign WorkTracker to a group
create or replace function assign_worktracker_to_group()
returns trigger as $$
declare
  v_week_start date;
  v_week_end date;
  v_group_uuid uuid;
begin
  -- Only process if we have both a date and driver
  if NEW.date is null or NEW.driver_uuid is null then
    return NEW;
  end if;

  -- Calculate week boundaries
  v_week_start := get_week_start(NEW.date);
  v_week_end := get_week_end(NEW.date);

  -- Try to find existing group
  select id into v_group_uuid
  from public."WorkTrackerGroups"
  where driver_uuid = NEW.driver_uuid
    and week_start = v_week_start
    and week_end = v_week_end
  limit 1;

  -- Create group if it doesn't exist
  if v_group_uuid is null then
    insert into public."WorkTrackerGroups" (driver_uuid, week_start, week_end, status)
    values (NEW.driver_uuid, v_week_start, v_week_end, 'draft')
    returning id into v_group_uuid;
  end if;

  -- Assign the group to the work tracker
  NEW.worktracker_group_uuid := v_group_uuid;

  return NEW;
end;
$$ language plpgsql;

-- Create trigger for new and updated work trackers
create trigger assign_worktracker_group_trigger
  before insert or update of date, driver_uuid
  on public."WorkTrackers"
  for each row
  execute function assign_worktracker_to_group();

-- Create Zones table
create table public."Zones" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  display_name text not null,
  description text,
  photo_path text,
  constraint Zones_pkey primary key (id)
);

alter table public."Zones" enable row level security;

create policy "Allow All for Auth"
  on public."Zones"
  as permissive
  for all
  to authenticated
using (true)
with check (true);

-- Create ZoneStateProvinces table
create table public."ZoneStateProvinces" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  state_province text not null,
  zone_uuid uuid not null,
  constraint ZoneStateProvinces_pkey primary key (id),
  constraint ZoneStateProvinces_zone_uuid_fkey foreign key (zone_uuid) references public."Zones" (id) on delete restrict
);

create index if not exists "ZoneStateProvinces_zone_uuid_idx" on public."ZoneStateProvinces" using btree (zone_uuid);

alter table public."ZoneStateProvinces" enable row level security;

create policy "Allow All for Auth"
  on public."ZoneStateProvinces"
  as permissive
  for all
  to authenticated
using (true)
with check (true);

-- Create ZoneQboClasses junction table (zone ↔ QBO class per connection)
create table public."ZoneQboClasses" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  zone_uuid uuid not null,
  qbo_connection_uuid uuid not null,
  qbo_class_id text not null,
  constraint ZoneQboClasses_pkey primary key (id),
  constraint ZoneQboClasses_zone_uuid_fkey foreign key (zone_uuid) references public."Zones" (id) on delete cascade,
  constraint ZoneQboClasses_qbo_connection_uuid_fkey foreign key (qbo_connection_uuid) references public."QboConnections" (id) on delete cascade,
  constraint ZoneQboClasses_unique_zone_connection unique (zone_uuid, qbo_connection_uuid)
);

create index if not exists "ZoneQboClasses_zone_uuid_idx" on public."ZoneQboClasses" using btree (zone_uuid);
create index if not exists "ZoneQboClasses_qbo_connection_uuid_idx" on public."ZoneQboClasses" using btree (qbo_connection_uuid);

alter table public."ZoneQboClasses" enable row level security;

create policy "Allow All for Auth"
  on public."ZoneQboClasses"
  as permissive
  for all
  to authenticated
using (true)
with check (true);

-- Create zone-photos storage bucket
insert into storage.buckets (id, name, public)
values ('zone-photos', 'zone-photos', true)
on conflict (id) do nothing;

-- Create WorkTrackerTypes table (user-configurable types for work trackers)
create table public."WorkTrackerTypes" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  display_name text not null,
  sort_order int not null default 0,
  constraint WorkTrackerTypes_pkey primary key (id)
);

alter table public."WorkTrackerTypes" enable row level security;

create policy "Allow All for Auth"
  on public."WorkTrackerTypes"
  as permissive
  for all
  to authenticated
using (true)
with check (true);

-- Seed default work tracker types
insert into public."WorkTrackerTypes" (display_name, sort_order) values
  ('Trip', 1),
  ('Repair/Maintenance', 2),
  ('Cleaning', 3);

-- Create WorkTrackerTypeQboAccounts junction table (type ↔ QBO account per connection)
create table public."WorkTrackerTypeQboAccounts" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  work_tracker_type_uuid uuid not null,
  qbo_connection_uuid uuid not null,
  qbo_account_id text not null,
  constraint WorkTrackerTypeQboAccounts_pkey primary key (id),
  constraint WorkTrackerTypeQboAccounts_type_fkey foreign key (work_tracker_type_uuid) references public."WorkTrackerTypes" (id) on delete cascade,
  constraint WorkTrackerTypeQboAccounts_conn_fkey foreign key (qbo_connection_uuid) references public."QboConnections" (id) on delete cascade,
  constraint WorkTrackerTypeQboAccounts_unique unique (work_tracker_type_uuid, qbo_connection_uuid)
);

create index if not exists "WorkTrackerTypeQboAccounts_type_idx" on public."WorkTrackerTypeQboAccounts" using btree (work_tracker_type_uuid);
create index if not exists "WorkTrackerTypeQboAccounts_conn_idx" on public."WorkTrackerTypeQboAccounts" using btree (qbo_connection_uuid);

alter table public."WorkTrackerTypeQboAccounts" enable row level security;

create policy "Allow All for Auth"
  on public."WorkTrackerTypeQboAccounts"
  as permissive
  for all
  to authenticated
using (true)
with check (true);

-- Add work_tracker_type_uuid to WorkTrackers
alter table public."WorkTrackers"
  add column work_tracker_type_uuid uuid,
  add constraint WorkTrackers_work_tracker_type_uuid_fkey
    foreign key (work_tracker_type_uuid) references public."WorkTrackerTypes" (id) on delete set null;

create index if not exists "WorkTrackers_work_tracker_type_uuid_idx"
  on public."WorkTrackers" using btree (work_tracker_type_uuid);

-- Add distance/duration columns to WorkTrackers
alter table public."WorkTrackers"
  add column distance_meters integer,
  add column drive_minutes integer;

-- Create enums for Drivers pay fields
create type public.pay_currency_type as enum ('CAD', 'USD');
create type public.pay_per_unit_type as enum ('KM', 'MI', 'HR');

-- Migrate Drivers.pay_currency to enum
alter table public."Drivers"
  alter column pay_currency drop default;

alter table public."Drivers"
  alter column pay_currency type public.pay_currency_type
  using pay_currency::public.pay_currency_type;

alter table public."Drivers"
  alter column pay_currency set default 'CAD'::public.pay_currency_type;

-- Migrate Drivers.pay_per_unit to enum
alter table public."Drivers"
  alter column pay_per_unit drop default;

alter table public."Drivers"
  alter column pay_per_unit type public.pay_per_unit_type
  using pay_per_unit::public.pay_per_unit_type;

alter table public."Drivers"
  alter column pay_per_unit set default 'KM'::public.pay_per_unit_type;



