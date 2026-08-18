-- =============================================================
-- WorkTrackerLineItems: itemized pay lines on a work tracker.
-- Each row is one billable/payable line (hauling, deadhead, setup,
-- teardown, maintenance, per diem, or a custom line) with a
-- quantity and a per-unit rate in cents.
-- =============================================================

do $$
begin
  create type public.work_tracker_line_item_type as enum (
    'hauling',
    'deadhead',
    'setup',
    'teardown',
    'maintenance',
    'per_diem',
    'custom'
  );
exception when duplicate_object then null;
end $$;

create table public."WorkTrackerLineItems" (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  work_tracker_uuid uuid not null,
  type public.work_tracker_line_item_type not null,
  quantity integer not null default 1,
  unit_amt_cents integer not null default 0,
  description text null,
  constraint work_tracker_line_items_pkey primary key (id),
  constraint work_tracker_line_items_work_tracker_uuid_fkey
    foreign key (work_tracker_uuid) references public."WorkTrackers" (id) on delete cascade,
  constraint work_tracker_line_items_quantity_check check (quantity >= 0),
  constraint work_tracker_line_items_unit_amt_cents_check check (unit_amt_cents >= 0)
) tablespace pg_default;

create index if not exists "WorkTrackerLineItems_work_tracker_uuid_idx"
  on public."WorkTrackerLineItems" using btree (work_tracker_uuid) tablespace pg_default;

-- =====================
-- RLS: mirrors the current WorkTrackers access model —
--   SELECT: admin/AM/viewer (all rows) + driver (rows on their own work trackers)
--   INSERT: admin/AM only
--   UPDATE: admin/AM (all rows) + driver (rows on their own work trackers)
--   DELETE: admin/AM only
-- =====================
alter table public."WorkTrackerLineItems" enable row level security;

create policy "work_tracker_line_items_select" on public."WorkTrackerLineItems"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
    or exists (
      select 1 from public."WorkTrackers" wt
      where wt.id = work_tracker_uuid
        and public.get_current_driver_id() is not null
        and wt.driver_uuid = public.get_current_driver_id()
    )
  );

create policy "work_tracker_line_items_insert" on public."WorkTrackerLineItems"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "work_tracker_line_items_update" on public."WorkTrackerLineItems"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
    or exists (
      select 1 from public."WorkTrackers" wt
      where wt.id = work_tracker_uuid
        and public.get_current_driver_id() is not null
        and wt.driver_uuid = public.get_current_driver_id()
    )
  )
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
    or exists (
      select 1 from public."WorkTrackers" wt
      where wt.id = work_tracker_uuid
        and public.get_current_driver_id() is not null
        and wt.driver_uuid = public.get_current_driver_id()
    )
  );

create policy "work_tracker_line_items_delete" on public."WorkTrackerLineItems"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );
