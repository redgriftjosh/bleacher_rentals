-- Persist the dashboard Zone filter so it survives refreshes.
-- zone_uuids: JSON array of selected Zone ids (mirrors rows / state_provinces pattern)
-- show_unassigned_zone: whether the "Unassigned" pseudo-zone is selected
ALTER TABLE public."DashboardFilterSettings"
  ADD COLUMN IF NOT EXISTS zone_uuids text NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS show_unassigned_zone boolean NOT NULL DEFAULT false;
