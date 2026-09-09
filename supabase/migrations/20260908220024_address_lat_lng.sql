-- Google Places already returns lat/lng at address-selection time, but it was
-- being discarded before it ever reached the DB. Persisting it lets a saved
-- address be used for things that need real coordinates later — timezone
-- derivation for the upcoming pickup/dropoff time picker, in particular.
-- No backfill: existing rows keep null lat/lng until re-saved through the app.
alter table public."Addresses"
  add column latitude double precision,
  add column longitude double precision;
