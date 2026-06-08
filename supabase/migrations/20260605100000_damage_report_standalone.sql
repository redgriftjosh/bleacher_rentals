-- Standalone Damage Reports: decouple from WorkTracker inspections
-- New enum columns replace boolean is_safe_to_sit / is_safe_to_haul
-- inspection_uuid becomes nullable for new standalone reports

-- 1. Create enum type
CREATE TYPE damage_severity AS ENUM ('none', 'minor', 'major');

-- 2. Add new enum columns
ALTER TABLE "DamageReports"
  ADD COLUMN seat_damage damage_severity NOT NULL DEFAULT 'none',
  ADD COLUMN haul_damage damage_severity NOT NULL DEFAULT 'none';

  
  -- Add created_by_user_uuid to track which driver created the damage report

ALTER TABLE "DamageReports"
  ADD COLUMN created_by_user_uuid UUID REFERENCES "Users"(id);


-- 3. Make inspection_uuid nullable (new reports won't have one)
ALTER TABLE "DamageReports"
  ALTER COLUMN inspection_uuid DROP NOT NULL;

-- 4. Backward-compat trigger: when old clients send inspection_uuid without
--    bleacher_uuid, fill bleacher_uuid from the linked WorkTracker
CREATE OR REPLACE FUNCTION damage_report_backfill_bleacher_uuid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inspection_uuid IS NOT NULL AND NEW.bleacher_uuid IS NULL THEN
    SELECT wt.bleacher_uuid INTO NEW.bleacher_uuid
    FROM "WorkTrackerInspections" wti
    JOIN "WorkTrackers" wt
      ON wt.pre_inspection_uuid = wti.id
      OR wt.post_inspection_uuid = wti.id
    WHERE wti.id = NEW.inspection_uuid
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_damage_report_backfill_bleacher
  BEFORE INSERT ON "DamageReports"
  FOR EACH ROW
  EXECUTE FUNCTION damage_report_backfill_bleacher_uuid();

