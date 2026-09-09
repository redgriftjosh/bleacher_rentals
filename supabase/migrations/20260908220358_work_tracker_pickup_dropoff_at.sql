-- ============================================================================
-- Pickup/dropoff time: exact / flexible / any_time. No timezone, no date.
--
-- `pickup_time`/`dropoff_time` are free text ("8am", "-", "anytime", a
-- driver's name in one row) with no structure at all — nothing to build a
-- proper time picker on. But the plain-time convention itself is correct and
-- stays: everyone reads the same clock value regardless of location (a 7am
-- pickup is 7am to the client, the account manager, and the driver). What's
-- new is structure, not a timezone — trips don't cross zones' worth of
-- meaning here, and pickup/dropoff never spans a day boundary.
--
-- Three states per side, picked deliberately by the user:
--   exact:     one time            (time_start = time_end)
--   flexible:  a window            (time_start < time_end)
--   any_time:  unset               (time_start = time_end = null)
--
-- `pickup_time`/`dropoff_time` stay as-is and keep working for anything that
-- still reads them (the driver app) — this migration does not backfill them.
-- Once a work tracker's pickup_time_mode/start/end are set through the new
-- picker, sync_work_tracker_time_text() keeps pickup_time following along as
-- a readable mirror (e.g. "10:00 AM" or "10:00 AM - 12:00 PM"). Same shape as
-- sync_driver_tax() / qty_decimal's trigger, but one-directional.
-- ============================================================================

create type public.work_tracker_time_mode as enum ('exact', 'flexible', 'any_time');

alter table public."WorkTrackers"
  add column pickup_time_mode public.work_tracker_time_mode not null default 'any_time',
  add column pickup_time_start time,
  add column pickup_time_end time,
  add column dropoff_time_mode public.work_tracker_time_mode not null default 'any_time',
  add column dropoff_time_start time,
  add column dropoff_time_end time;

alter table public."WorkTrackers"
  add constraint work_trackers_pickup_time_range_check
    check (pickup_time_end is null or pickup_time_start is null or pickup_time_end >= pickup_time_start),
  add constraint work_trackers_dropoff_time_range_check
    check (dropoff_time_end is null or dropoff_time_start is null or dropoff_time_end >= dropoff_time_start);

comment on column public."WorkTrackers".pickup_time_mode is
  'exact (one time), flexible (a window), or any_time (unset). Source of truth for pickup time going forward.';
comment on column public."WorkTrackers".pickup_time_start is
  'The time (exact), or window start (flexible). Null for any_time.';
comment on column public."WorkTrackers".pickup_time_end is
  'Equals pickup_time_start for exact. Window end for flexible. Null for any_time.';
comment on column public."WorkTrackers".dropoff_time_mode is
  'exact (one time), flexible (a window), or any_time (unset). Source of truth for dropoff time going forward.';
comment on column public."WorkTrackers".dropoff_time_start is
  'The time (exact), or window start (flexible). Null for any_time.';
comment on column public."WorkTrackers".dropoff_time_end is
  'Equals dropoff_time_start for exact. Window end for flexible. Null for any_time.';

comment on column public."WorkTrackers".pickup_time is
  'Readable mirror of pickup_time_mode/start/end (e.g. "10:00 AM" or "10:00 AM - 12:00 PM") once those are set, maintained by sync_work_tracker_time_text(). Historical free-text rows predating this are untouched. Kept for the driver app; write pickup_time_mode/start/end instead.';
comment on column public."WorkTrackers".dropoff_time is
  'Readable mirror of dropoff_time_mode/start/end, maintained by sync_work_tracker_time_text(). Historical free-text rows predating this are untouched. Kept for the driver app; write dropoff_time_mode/start/end instead.';

-- ----------------------------------------------------------------------------
-- Keep pickup_time/dropoff_time following the structured columns, one
-- direction only. any_time never overwrites — a row with nothing set keeps
-- whatever free text it already had, matching today's behavior.
-- ----------------------------------------------------------------------------
create or replace function public.sync_work_tracker_time_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.pickup_time_mode = 'exact' and NEW.pickup_time_start is not null then
    NEW.pickup_time := to_char(NEW.pickup_time_start, 'HH12:MI AM');
  elsif NEW.pickup_time_mode = 'flexible'
    and NEW.pickup_time_start is not null and NEW.pickup_time_end is not null then
    NEW.pickup_time := to_char(NEW.pickup_time_start, 'HH12:MI AM')
      || ' - ' || to_char(NEW.pickup_time_end, 'HH12:MI AM');
  end if;

  if NEW.dropoff_time_mode = 'exact' and NEW.dropoff_time_start is not null then
    NEW.dropoff_time := to_char(NEW.dropoff_time_start, 'HH12:MI AM');
  elsif NEW.dropoff_time_mode = 'flexible'
    and NEW.dropoff_time_start is not null and NEW.dropoff_time_end is not null then
    NEW.dropoff_time := to_char(NEW.dropoff_time_start, 'HH12:MI AM')
      || ' - ' || to_char(NEW.dropoff_time_end, 'HH12:MI AM');
  end if;

  return NEW;
end;
$$;

drop trigger if exists sync_work_tracker_time_text on public."WorkTrackers";
create trigger sync_work_tracker_time_text
  before insert or update on public."WorkTrackers"
  for each row
  execute function public.sync_work_tracker_time_text();
