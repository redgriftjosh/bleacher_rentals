-- 1) Add contract revenue (cents) + event status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE public.event_status AS ENUM ('quoted', 'booked', 'lost');
  END IF;
END $$;

ALTER TABLE public."Events"
  ADD COLUMN IF NOT EXISTS contract_revenue_cents integer NULL,
  ADD COLUMN IF NOT EXISTS event_status public.event_status NULL;

-- 2) Backfill event_status from existing booked boolean (optional but recommended)
--    If you already have rows, this sets status to 'booked' when booked=true, otherwise 'quoted'.
UPDATE public."Events"
SET event_status = CASE
  WHEN booked = true THEN 'booked'::public.event_status
  ELSE 'quoted'::public.event_status
END
WHERE event_status IS NULL;

-- 3) Keep booked boolean in sync with event_status
CREATE OR REPLACE FUNCTION public.sync_events_booked_from_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If event_status is explicitly set, force booked to match it.
  IF NEW.event_status IS NOT NULL THEN
    NEW.booked := (NEW.event_status = 'booked');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_sync_booked_from_status ON public."Events";

CREATE TRIGGER trg_events_sync_booked_from_status
BEFORE INSERT OR UPDATE OF event_status
ON public."Events"
FOR EACH ROW
EXECUTE FUNCTION public.sync_events_booked_from_status();

-- 4) (Optional) Also keep event_status in sync if someone updates booked directly
--    This makes the transition period less error-prone.
CREATE OR REPLACE FUNCTION public.sync_events_status_from_booked()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.booked IS DISTINCT FROM OLD.booked THEN
    IF NEW.booked = true THEN
      NEW.event_status := 'booked'::public.event_status;
    ELSE
      -- If it was booked and someone un-books it, default back to 'quoted'
      -- (You can change this to 'lost' if that better matches your workflow.)
      IF NEW.event_status IS NULL OR NEW.event_status = 'booked'::public.event_status THEN
        NEW.event_status := 'quoted'::public.event_status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_sync_status_from_booked ON public."Events";

CREATE TRIGGER trg_events_sync_status_from_booked
BEFORE UPDATE OF booked
ON public."Events"
FOR EACH ROW
EXECUTE FUNCTION public.sync_events_status_from_booked();
