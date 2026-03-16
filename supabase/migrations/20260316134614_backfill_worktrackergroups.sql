-- Backfill existing WorkTrackers into WorkTrackerGroups
DO $$
DECLARE
  v_tracker record;
  v_week_start date;
  v_week_end date;
  v_group_uuid uuid;
BEGIN
  FOR v_tracker IN 
    SELECT id, date, driver_uuid 
    FROM public."WorkTrackers" 
    WHERE date IS NOT NULL AND driver_uuid IS NOT NULL
  LOOP
    v_week_start := get_week_start(v_tracker.date);
    v_week_end := get_week_end(v_tracker.date);

    -- Find or create group
    SELECT id INTO v_group_uuid
    FROM public."WorkTrackerGroups"
    WHERE driver_uuid = v_tracker.driver_uuid
      AND week_start = v_week_start
      AND week_end = v_week_end
    LIMIT 1;

    IF v_group_uuid IS NULL THEN
      INSERT INTO public."WorkTrackerGroups" (driver_uuid, week_start, week_end, status)
      VALUES (v_tracker.driver_uuid, v_week_start, v_week_end, 'draft')
      RETURNING id INTO v_group_uuid;
    END IF;

    -- Update the work tracker
    UPDATE public."WorkTrackers"
    SET worktracker_group_uuid = v_group_uuid
    WHERE id = v_tracker.id;
  END LOOP;
END $$;