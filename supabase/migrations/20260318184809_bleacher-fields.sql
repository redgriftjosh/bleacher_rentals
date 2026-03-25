create type bleacher_opening_dir as enum (
  'driver',
  'passenger'
);

ALTER TABLE public."Bleachers"
    ADD COLUMN trailer_length NUMERIC,
    ADD COLUMN opening_direction bleacher_opening_dir;
