-- Migration: Add trailer/transport fields to Bleachers table
ALTER TABLE public."Bleachers"
  ADD COLUMN hitch_type        TEXT,
  ADD COLUMN vin_number        TEXT,
  ADD COLUMN tag_number        TEXT,
  ADD COLUMN manufacturer      TEXT,
  ADD COLUMN height_folded_ft  NUMERIC,
  ADD COLUMN gvwr              NUMERIC;

-- Migration: Add teardown/setup fields to worktrackers table

ALTER TABLE public."WorkTrackers"
  ADD COLUMN teardown_required      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN pickup_instructions    TEXT,
  ADD COLUMN setup_required         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN dropoff_instructions   TEXT,
  ADD COLUMN project_number         TEXT,
  ADD COLUMN bol_number             TEXT;
