-- ============================================================================
-- Real pickup/dropoff instants, with a timezone.
--
-- `pickup_time`/`dropoff_time` are free text ("8am", "-", "anytime", a
-- driver's name in one row) with no timezone at all — nothing to build a
-- proper time picker on, and no way to know which zone a value was even
-- meant in once the trip crosses one. `pickup_at`/`dropoff_at` are real
-- instants; `pickup_timezone`/`dropoff_timezone` are the IANA zone (e.g.
-- "America/Toronto") derived from the pickup/dropoff address, so the instant
-- can always be rendered back in the right local time.
--
-- `pickup_time`/`dropoff_time` stay as-is and keep working for anything that
-- still reads them (the driver app, historical free-text entries) — this
-- migration does not backfill them. Once a work tracker's pickup_at/
-- pickup_timezone are set through the new picker, sync_work_tracker_time_text()
-- keeps pickup_time following along as a readable mirror (e.g.
-- "10:00 AM (EDT)"). Same shape as sync_driver_tax() / qty_decimal's trigger,
-- but one-directional: pickup_time is never parsed back into pickup_at.
-- ============================================================================

alter table public."WorkTrackers"
  add column pickup_at timestamptz,
  add column pickup_timezone text,
  add column dropoff_at timestamptz,
  add column dropoff_timezone text;

comment on column public."WorkTrackers".pickup_at is
  'The actual pickup instant. Source of truth for pickup time going forward.';
comment on column public."WorkTrackers".pickup_timezone is
  'IANA zone pickup_at is displayed in (e.g. "America/Toronto"), derived from the pickup address.';
comment on column public."WorkTrackers".dropoff_at is
  'The actual dropoff instant. Source of truth for dropoff time going forward.';
comment on column public."WorkTrackers".dropoff_timezone is
  'IANA zone dropoff_at is displayed in, derived from the dropoff address.';

comment on column public."WorkTrackers".pickup_time is
  'Readable mirror of pickup_at/pickup_timezone (e.g. "10:00 AM (EDT)") once those are set, maintained by sync_work_tracker_time_text(). Historical free-text rows predating pickup_at are untouched. Kept for the driver app; write pickup_at instead.';
comment on column public."WorkTrackers".dropoff_time is
  'Readable mirror of dropoff_at/dropoff_timezone (e.g. "10:00 AM (EDT)") once those are set, maintained by sync_work_tracker_time_text(). Historical free-text rows predating dropoff_at are untouched. Kept for the driver app; write dropoff_at instead.';

-- ----------------------------------------------------------------------------
-- Keep pickup_time/dropoff_time following pickup_at/dropoff_at, one direction
-- only. A row that has never had pickup_at set keeps whatever free text it
-- already had — this only starts overwriting a row once it actually gets a
-- real pickup_at + pickup_timezone.
--
-- to_char's TZ format only reflects the *session* timezone, so pickup_timezone
-- is applied via a transaction-local set_config() right before formatting
-- (the `true` third argument keeps it scoped to this transaction only).
-- ----------------------------------------------------------------------------
create or replace function public.sync_work_tracker_time_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.pickup_at is not null and NEW.pickup_timezone is not null then
    perform set_config('timezone', NEW.pickup_timezone, true);
    NEW.pickup_time := to_char(NEW.pickup_at, 'HH12:MI AM "("TZ")"');
  end if;

  if NEW.dropoff_at is not null and NEW.dropoff_timezone is not null then
    perform set_config('timezone', NEW.dropoff_timezone, true);
    NEW.dropoff_time := to_char(NEW.dropoff_at, 'HH12:MI AM "("TZ")"');
  end if;

  return NEW;
end;
$$;

drop trigger if exists sync_work_tracker_time_text on public."WorkTrackers";
create trigger sync_work_tracker_time_text
  before insert or update on public."WorkTrackers"
  for each row
  execute function public.sync_work_tracker_time_text();
