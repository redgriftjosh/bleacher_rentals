-- Give the 3 canonical work tracker types a stable, code-reviewed identifier
-- that the app can key its logic off, instead of matching the freely-editable
-- `display_name` text column. See docs/specs/work-tracker-fixed-types.md.
--
-- `code` is nullable: only these 3 rows will ever have one. Every other row
-- (legacy types, anything created before this migration) keeps `code` null
-- and is invisible to the app's Type selector, regardless of `is_deleted`.
create type public.work_tracker_type_code as enum (
  'trip',
  'repair_maintenance',
  'site_visit_cleaning_other'
);

alter table public."WorkTrackerTypes"
  add column code public.work_tracker_type_code;

create unique index "WorkTrackerTypes_code_key" on public."WorkTrackerTypes" ("code");

-- Assign codes to production's 3 existing canonical rows by id, and rename 2
-- of them to their final display names. These ids are production data as
-- captured 2026-09-08. Idempotent upserts, not plain UPDATEs: against a real
-- database the row already exists and this only sets code (+ renames 2 of
-- them); against a fresh database — including CI, which runs
-- `supabase db reset --no-seed` and so never loads seed.sql's own copy of
-- these rows — this creates the 3 canonical rows outright, so the invariants
-- below hold either way. seed.sql's own INSERT of the same 3 ids is
-- ON CONFLICT DO NOTHING for exactly this reason (see seed.sql).
insert into public."WorkTrackerTypes" (id, display_name, code)
  values ('e3c00371-897d-4a80-93da-66f374deaa2d', 'Trip', 'trip')
  on conflict (id) do update set code = excluded.code;

insert into public."WorkTrackerTypes" (id, display_name, code)
  values ('42726bce-e191-45b1-8082-c297a9ca128a', 'Repair / Maintenance', 'repair_maintenance')
  on conflict (id) do update set code = excluded.code, display_name = excluded.display_name;

insert into public."WorkTrackerTypes" (id, display_name, code)
  values ('cbffa6a5-d397-48d3-8bda-c50c6dfe0151', 'Site Visit / Cleaning / Other', 'site_visit_cleaning_other')
  on conflict (id) do update set code = excluded.code, display_name = excluded.display_name;

-- Every work tracker on a legacy type (Set up, Hotel/ Per Diem, Tear down,
-- Deadhead, Site Visit) merges into "Site Visit / Cleaning / Other" per Josh.
update public."WorkTrackers"
  set work_tracker_type_uuid = 'cbffa6a5-d397-48d3-8bda-c50c6dfe0151'
  where work_tracker_type_uuid in (
    '393accac-fc6b-44ad-b9f1-a7f6e293959f', -- Set up
    '6aa577f4-aa93-498e-a128-bc5d7fd1fa71', -- Hotel/ Per Diem
    'ac251f2c-e17e-4dfd-99e4-78a322babf00', -- Tear down
    '2e927e1b-bace-41d9-abb1-628b27efd3dc', -- Deadhead
    '635ecdc5-2fb4-4ca2-b54d-744922a09124'  -- Site Visit
  );

-- Soft-delete the now-unused legacy type rows. Not hard-deleted, so their
-- (now orphaned) WorkTrackerTypeQboAccounts history and any lingering FK
-- references stay intact.
update public."WorkTrackerTypes"
  set is_deleted = true
  where id in (
    '393accac-fc6b-44ad-b9f1-a7f6e293959f',
    '6aa577f4-aa93-498e-a128-bc5d7fd1fa71',
    'ac251f2c-e17e-4dfd-99e4-78a322babf00',
    '2e927e1b-bace-41d9-abb1-628b27efd3dc',
    '635ecdc5-2fb4-4ca2-b54d-744922a09124'
  );
