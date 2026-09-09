-- ============================================================================
-- Addresses.country and .place_id.
--
-- country: the ISO-2 country code (e.g. "US", "CA") Google's Places API
-- already returns per address, previously discarded. 4 separate spots in the
-- app currently guess country by splitting `street` on commas and string-
-- matching "USA"/"Canada" in the tail — brittle, and wrong the moment a
-- suggestion's formatting varies. This migration adds the real column; a
-- follow-up change points those 4 call sites at it instead.
--
-- place_id: Google's stable identifier for the place. Lets the app re-derive
-- fresh data for a saved address later (re-geocode, recompute a timezone if
-- that's ever added back) without re-parsing free text or asking someone to
-- re-pick the address.
--
-- No backfill — existing rows keep both columns null, same policy as
-- latitude/longitude before this.
-- ============================================================================

alter table public."Addresses"
  add column country text,
  add column place_id text;

comment on column public."Addresses".country is
  'ISO-2 country code from Google Places (e.g. "US", "CA"). Null for addresses saved before this column, or entered without going through the autocomplete.';
comment on column public."Addresses".place_id is
  'Google Places place_id for this address, so it can be re-geocoded later without re-parsing free text. Null for addresses saved before this column.';
