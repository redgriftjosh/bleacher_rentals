-- Add gross margin percent target columns to ScorecardTargets
ALTER TABLE public."ScorecardTargets"
  ADD COLUMN gross_margin_percent_weekly smallint NOT NULL DEFAULT 40,
  ADD COLUMN gross_margin_percent_quarterly smallint NOT NULL DEFAULT 40,
  ADD COLUMN gross_margin_percent_annually smallint NOT NULL DEFAULT 40;
