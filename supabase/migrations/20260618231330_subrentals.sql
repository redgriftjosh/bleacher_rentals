-- Create enum for subrental request status
create type public.bleacher_subrental_status as enum ('pending', 'accepted', 'denied');

-- Create SubrentalEvents table
create table public."SubrentalEvents" (
  id uuid not null default gen_random_uuid(),
  event_start date not null,
  event_end date not null,
  notes text null,
  created_by_user_uuid uuid null default get_current_user_uuid(),
  created_at timestamptz not null default now(),
  status public.bleacher_subrental_status not null default 'pending',
  requested_zone_uuid uuid null,
  bleacher_uuid uuid null,
  reviewed_by_user_uuid uuid null,
  reviewed_at timestamptz null,
  constraint subrental_events_pkey primary key (id),
  constraint subrental_events_requested_zone_uuid_fkey
    foreign key (requested_zone_uuid) references public."Zones" (id) on delete set null,
  constraint subrental_events_bleacher_uuid_fkey
    foreign key (bleacher_uuid) references public."Bleachers" (id) on delete set null
) tablespace pg_default;

-- Indexes
create index if not exists "SubrentalEvents_requested_zone_uuid_idx"
  on public."SubrentalEvents" using btree (requested_zone_uuid) tablespace pg_default;

create index if not exists "SubrentalEvents_bleacher_uuid_idx"
  on public."SubrentalEvents" using btree (bleacher_uuid) tablespace pg_default;

create index if not exists "SubrentalEvents_created_by_user_uuid_idx"
  on public."SubrentalEvents" using btree (created_by_user_uuid) tablespace pg_default;

create index if not exists "SubrentalEvents_status_idx"
  on public."SubrentalEvents" using btree (status) tablespace pg_default;

create policy "subrental_events_select" on public."SubrentalEvents"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "subrental_events_insert" on public."SubrentalEvents"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "subrental_events_update" on public."SubrentalEvents"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "subrental_events_delete" on public."SubrentalEvents"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );