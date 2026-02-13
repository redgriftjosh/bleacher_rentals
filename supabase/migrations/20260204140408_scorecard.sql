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


-- ScorecardTargets: per-account-manager configurable targets
-- 4 metrics (quotes, sales, value_of_sales, value_of_revenue)
-- x 3 time ranges (weekly, quarterly, annually) = 12 targets per row
-- Only admins may insert/update these rows.

CREATE TABLE IF NOT EXISTS public."ScorecardTargets" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- FK to the account manager user
  user_uuid uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

  -- Number of Quotes targets
  quotes_weekly     integer NOT NULL DEFAULT 7,
  quotes_quarterly  integer NOT NULL DEFAULT 60,
  quotes_annually   integer NOT NULL DEFAULT 250,

  -- Number of Sales targets
  sales_weekly      integer NOT NULL DEFAULT 3,
  sales_quarterly   integer NOT NULL DEFAULT 35,
  sales_annually    integer NOT NULL DEFAULT 150,

  -- Value of Sales targets (stored in cents)
  value_of_sales_weekly_cents     integer NOT NULL DEFAULT 2500000,   -- $25,000
  value_of_sales_quarterly_cents  integer NOT NULL DEFAULT 30000000,  -- $300,000
  value_of_sales_annually_cents   integer NOT NULL DEFAULT 120000000, -- $1,200,000

  -- Value of Revenue targets (stored in cents)
  value_of_revenue_weekly_cents     integer NOT NULL DEFAULT 7500000,   -- $75,000
  value_of_revenue_quarterly_cents  integer NOT NULL DEFAULT 120000000, -- $1,200,000
  value_of_revenue_annually_cents   integer NOT NULL DEFAULT 480000000, -- $4,800,000

  CONSTRAINT scorecard_targets_user_unique UNIQUE (user_uuid)
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_scorecard_targets_user_uuid
  ON public."ScorecardTargets"(user_uuid);

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION public.scorecard_targets_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scorecard_targets_touch_updated_at ON public."ScorecardTargets";

CREATE TRIGGER scorecard_targets_touch_updated_at
BEFORE UPDATE ON public."ScorecardTargets"
FOR EACH ROW
EXECUTE FUNCTION public.scorecard_targets_touch_updated_at();

-- Enable RLS
ALTER TABLE public."ScorecardTargets" ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can view targets
CREATE POLICY "ScorecardTargets: authenticated read"
  ON public."ScorecardTargets"
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert/Update/Delete: only admins (is_admin = true in Users table)
CREATE POLICY "ScorecardTargets: admin write"
  ON public."ScorecardTargets"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."Users" u
      WHERE u.clerk_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        AND u.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Users" u
      WHERE u.clerk_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        AND u.is_admin = true
    )
  );

-- Note: powersync publication is already FOR ALL TABLES, so no ALTER needed.
