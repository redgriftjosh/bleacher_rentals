-- =============================================================
-- Fix: scorecard trigger functions need SECURITY DEFINER
--
-- Problem: when a driver updates a WorkTracker (e.g. accepting it),
-- the trigger sync_driver_scorecard_stats_per_driver fires and
-- writes to DriverScorecardStatsPerDriver. Without SECURITY DEFINER,
-- the trigger runs as the invoking user (the driver), who has no
-- RLS access to the scorecard tables → 42501 error.
--
-- Same issue for maintenance triggers if a non-admin modifies
-- MaintenanceEvents.
--
-- Fix: recreate all four scorecard functions with SECURITY DEFINER
-- and restrict search_path for safety.
-- =============================================================

-- 1. recompute_driver_scorecard_bucket
--    Writes to DriverScorecardStatsPerDriver
CREATE OR REPLACE FUNCTION public.recompute_driver_scorecard_bucket(
  p_driver UUID,
  p_year   SMALLINT
)
RETURNS VOID AS $$
BEGIN
  IF p_driver IS NULL OR p_year IS NULL THEN
    RETURN;
  END IF;

  WITH agg AS (
    SELECT
      COALESCE(SUM(distance_meters), 0)::BIGINT AS distance_meters,
      COALESCE(SUM(drive_minutes), 0)::BIGINT   AS drive_minutes,
      COALESCE(SUM(pay_cents), 0)::BIGINT       AS pay_cents,
      COUNT(*)::INTEGER                         AS trip_count
    FROM public."WorkTrackers"
    WHERE driver_uuid = p_driver
      AND date IS NOT NULL
      AND EXTRACT(YEAR FROM date)::SMALLINT = p_year
  )
  INSERT INTO public."DriverScorecardStatsPerDriver" (
    driver_uuid, year, distance_meters, drive_minutes, pay_cents, trip_count
  )
  SELECT p_driver, p_year, distance_meters, drive_minutes, pay_cents, trip_count
  FROM agg
  WHERE trip_count > 0
  ON CONFLICT (driver_uuid, year) DO UPDATE SET
    distance_meters = EXCLUDED.distance_meters,
    drive_minutes   = EXCLUDED.drive_minutes,
    pay_cents       = EXCLUDED.pay_cents,
    trip_count      = EXCLUDED.trip_count;

  -- If no source rows remain for this bucket, drop the aggregate row.
  DELETE FROM public."DriverScorecardStatsPerDriver"
  WHERE driver_uuid = p_driver
    AND year = p_year
    AND NOT EXISTS (
      SELECT 1 FROM public."WorkTrackers"
      WHERE driver_uuid = p_driver
        AND date IS NOT NULL
        AND EXTRACT(YEAR FROM date)::SMALLINT = p_year
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. sync_driver_scorecard_stats_per_driver (trigger on WorkTrackers)
CREATE OR REPLACE FUNCTION public.sync_driver_scorecard_stats_per_driver()
RETURNS TRIGGER AS $$
DECLARE
  old_driver UUID     := NULL;
  old_year   SMALLINT := NULL;
  new_driver UUID     := NULL;
  new_year   SMALLINT := NULL;
BEGIN
  -- Recompute OLD bucket
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    IF OLD.driver_uuid IS NOT NULL AND OLD.date IS NOT NULL THEN
      old_driver := OLD.driver_uuid;
      old_year   := EXTRACT(YEAR FROM OLD.date)::SMALLINT;
      PERFORM public.recompute_driver_scorecard_bucket(old_driver, old_year);
    END IF;
  END IF;

  -- Recompute NEW bucket (skip if identical to OLD bucket — already recomputed)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.driver_uuid IS NOT NULL AND NEW.date IS NOT NULL THEN
      new_driver := NEW.driver_uuid;
      new_year   := EXTRACT(YEAR FROM NEW.date)::SMALLINT;
      IF new_driver IS DISTINCT FROM old_driver OR new_year IS DISTINCT FROM old_year THEN
        PERFORM public.recompute_driver_scorecard_bucket(new_driver, new_year);
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. update_driver_scorecard_stats_per_driver_last_updated (timestamp trigger)
CREATE OR REPLACE FUNCTION public.update_driver_scorecard_stats_per_driver_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. recompute_maintenance_cost_per_year_bucket
--    Writes to DriverScoreCardStats
CREATE OR REPLACE FUNCTION public.recompute_maintenance_cost_per_year_bucket(
  p_year SMALLINT
)
RETURNS VOID AS $$
DECLARE
  k CONSTANT TEXT := 'maintenance_cost_per_year';
BEGIN
  IF p_year IS NULL THEN
    RETURN;
  END IF;

  WITH agg AS (
    SELECT COALESCE(SUM(cost_cents), 0)::BIGINT AS value,
           COUNT(*)::INTEGER                    AS row_count
    FROM public."MaintenanceEvents"
    WHERE event_start IS NOT NULL
      AND EXTRACT(YEAR FROM event_start)::SMALLINT = p_year
  )
  INSERT INTO public."DriverScoreCardStats" (year, key, value)
  SELECT p_year, k, value
  FROM agg
  WHERE row_count > 0
  ON CONFLICT (year, key) DO UPDATE SET
    value = EXCLUDED.value;

  DELETE FROM public."DriverScoreCardStats"
  WHERE year = p_year
    AND key = k
    AND NOT EXISTS (
      SELECT 1 FROM public."MaintenanceEvents"
      WHERE event_start IS NOT NULL
        AND EXTRACT(YEAR FROM event_start)::SMALLINT = p_year
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. sync_maintenance_cost_per_year (trigger on MaintenanceEvents)
CREATE OR REPLACE FUNCTION public.sync_maintenance_cost_per_year()
RETURNS TRIGGER AS $$
DECLARE
  old_year SMALLINT := NULL;
  new_year SMALLINT := NULL;
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    IF OLD.event_start IS NOT NULL THEN
      old_year := EXTRACT(YEAR FROM OLD.event_start)::SMALLINT;
      PERFORM public.recompute_maintenance_cost_per_year_bucket(old_year);
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.event_start IS NOT NULL THEN
      new_year := EXTRACT(YEAR FROM NEW.event_start)::SMALLINT;
      IF new_year IS DISTINCT FROM old_year THEN
        PERFORM public.recompute_maintenance_cost_per_year_bucket(new_year);
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. update_driver_scorecard_stats_last_updated (timestamp trigger)
CREATE OR REPLACE FUNCTION public.update_driver_scorecard_stats_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
