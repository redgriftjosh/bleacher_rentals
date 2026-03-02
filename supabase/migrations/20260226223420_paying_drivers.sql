create table public."Vendors" (
	id uuid not null default gen_random_uuid (),
	created_at timestamp with time zone not null default now(),
	qbo_vendor_id text,
	display_name text not null,
	is_active boolean not null default true,
	logo_url text,
	constraint Vendors_pkey primary key (id)
);

alter table public."Vendors" enable row level security;

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

create table public."QboTokens" (
  id uuid not null default gen_random_uuid (),
  encrypted_token_value text not null,
  constraint QboTokens_pkey primary key (id)
);

alter table public."QboTokens" enable row level security;

create policy "Allow All for Auth"
	on public."QboTokens"
	as permissive
	for all
	to authenticated
using (true)
with check (true);

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