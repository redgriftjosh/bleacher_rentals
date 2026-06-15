-- Add soft-delete to Events
ALTER TABLE public."Events"
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
