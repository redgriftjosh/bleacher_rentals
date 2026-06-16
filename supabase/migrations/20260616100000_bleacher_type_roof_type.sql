DO $$ BEGIN
  CREATE TYPE roof_type AS ENUM ('canopy', 'none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "BleacherTypes"
  ADD COLUMN IF NOT EXISTS roof_type roof_type NOT NULL DEFAULT 'none';
