-- ============================================================================
-- SalesScorecardStatsPerAccountManager: aggregate per-AM per-year sales metrics
-- ============================================================================
--
-- One row per (account_manager_uuid, year). Each column is independently
-- computed from its own source date field:
--   quotes_sent_count     — COUNT Events WHERE YEAR(created_at) = year
--   sales_count           — COUNT Events WHERE booked AND YEAR(booked_at) = year
--   value_of_sales_cents  — SUM(contract_revenue_cents) WHERE booked AND YEAR(booked_at) = year
--   revenue_cents         — SUM(contract_revenue_cents) WHERE booked AND YEAR(event_start) = year
--   cogs_cents            — SUM(pay_cents) from WorkTrackers via driver->AM AND YEAR(date) = year
--
-- Events link to AM via: Events.created_by_user_uuid -> Users.id -> AccountManagers.user_uuid
-- ============================================================================

CREATE TABLE "SalesScorecardStatsPerAccountManager" (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_manager_uuid     UUID NOT NULL REFERENCES public."AccountManagers"(id) ON DELETE CASCADE,
  year                     SMALLINT NOT NULL,
  quotes_sent_count        INTEGER NOT NULL DEFAULT 0,
  sales_count              INTEGER NOT NULL DEFAULT 0,
  value_of_sales_cents     BIGINT NOT NULL DEFAULT 0,
  revenue_cents            BIGINT NOT NULL DEFAULT 0,
  cogs_cents               BIGINT NOT NULL DEFAULT 0,
  last_updated             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sales_scorecard_stats_per_am_unique UNIQUE (account_manager_uuid, year)
);

CREATE INDEX idx_sales_scorecard_stats_per_am
  ON public."SalesScorecardStatsPerAccountManager" (account_manager_uuid);

ALTER TABLE public."SalesScorecardStatsPerAccountManager" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All for Auth"
  ON public."SalesScorecardStatsPerAccountManager"
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true);

-- Auto-update last_updated
CREATE OR REPLACE FUNCTION public.update_sales_scorecard_stats_per_am_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sales_scorecard_stats_per_am_last_updated
  BEFORE UPDATE ON public."SalesScorecardStatsPerAccountManager"
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_scorecard_stats_per_am_last_updated();


-- ============================================================================
-- Recompute function: recalculate all columns for one (AM, year) bucket
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recompute_sales_scorecard_bucket(
  p_am   UUID,
  p_year SMALLINT
)
RETURNS VOID AS $$
DECLARE
  v_user_uuid UUID;
  v_quotes_sent  INTEGER;
  v_sales        INTEGER;
  v_value_sales  BIGINT;
  v_revenue      BIGINT;
  v_cogs         BIGINT;
BEGIN
  IF p_am IS NULL OR p_year IS NULL THEN
    RETURN;
  END IF;

  SELECT user_uuid INTO v_user_uuid
  FROM public."AccountManagers"
  WHERE id = p_am;

  IF v_user_uuid IS NULL THEN
    RETURN;
  END IF;

  -- Quotes sent: all events created by this user in this year (by created_at)
  SELECT COUNT(*)::INTEGER INTO v_quotes_sent
  FROM public."Events"
  WHERE created_by_user_uuid = v_user_uuid
    AND created_at IS NOT NULL
    AND EXTRACT(YEAR FROM created_at)::SMALLINT = p_year;

  -- Sales count: booked events by this user in this year (by booked_at)
  SELECT COUNT(*)::INTEGER INTO v_sales
  FROM public."Events"
  WHERE created_by_user_uuid = v_user_uuid
    AND event_status = 'booked'
    AND booked_at IS NOT NULL
    AND EXTRACT(YEAR FROM booked_at)::SMALLINT = p_year;

  -- Value of sales: sum revenue for booked events by this user (by booked_at)
  SELECT COALESCE(SUM(contract_revenue_cents), 0)::BIGINT INTO v_value_sales
  FROM public."Events"
  WHERE created_by_user_uuid = v_user_uuid
    AND event_status = 'booked'
    AND booked_at IS NOT NULL
    AND EXTRACT(YEAR FROM booked_at)::SMALLINT = p_year;

  -- Revenue: sum revenue for booked events by this user (by event_start)
  SELECT COALESCE(SUM(contract_revenue_cents), 0)::BIGINT INTO v_revenue
  FROM public."Events"
  WHERE created_by_user_uuid = v_user_uuid
    AND event_status = 'booked'
    AND event_start IS NOT NULL
    AND EXTRACT(YEAR FROM event_start)::SMALLINT = p_year;

  -- COGS: sum pay_cents from WorkTrackers via driver -> AM
  SELECT COALESCE(SUM(wt.pay_cents), 0)::BIGINT INTO v_cogs
  FROM public."WorkTrackers" wt
  INNER JOIN public."Drivers" d ON d.id = wt.driver_uuid
  WHERE d.account_manager_uuid = p_am
    AND wt.date IS NOT NULL
    AND EXTRACT(YEAR FROM wt.date)::SMALLINT = p_year;

  -- Upsert if any metric is non-zero
  IF v_quotes_sent > 0 OR v_sales > 0 OR v_value_sales > 0 OR v_revenue > 0 OR v_cogs > 0 THEN
    INSERT INTO public."SalesScorecardStatsPerAccountManager" (
      account_manager_uuid, year,
      quotes_sent_count, sales_count, value_of_sales_cents, revenue_cents, cogs_cents
    )
    VALUES (p_am, p_year, v_quotes_sent, v_sales, v_value_sales, v_revenue, v_cogs)
    ON CONFLICT (account_manager_uuid, year) DO UPDATE SET
      quotes_sent_count    = EXCLUDED.quotes_sent_count,
      sales_count          = EXCLUDED.sales_count,
      value_of_sales_cents = EXCLUDED.value_of_sales_cents,
      revenue_cents        = EXCLUDED.revenue_cents,
      cogs_cents           = EXCLUDED.cogs_cents;
  END IF;

  -- Clean up empty buckets
  DELETE FROM public."SalesScorecardStatsPerAccountManager"
  WHERE account_manager_uuid = p_am
    AND year = p_year
    AND quotes_sent_count = 0
    AND sales_count = 0
    AND value_of_sales_cents = 0
    AND revenue_cents = 0
    AND cogs_cents = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- Helper: resolve AM UUID from a user UUID
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_am_uuid_for_user(p_user_uuid UUID)
RETURNS UUID AS $$
  SELECT id FROM public."AccountManagers" WHERE user_uuid = p_user_uuid LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- Trigger on Events: keep sales scorecard in sync
-- ============================================================================
--
-- When an Event changes, we need to recompute all year buckets that could be
-- affected. An event has 3 date fields (created_at, booked_at, event_start)
-- each of which may place the event in a different year for different metrics.
-- We collect all distinct (AM, year) pairs from OLD and NEW and recompute each.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_sales_scorecard_on_event()
RETURNS TRIGGER AS $$
DECLARE
  old_am UUID := NULL;
  new_am UUID := NULL;
  yr     SMALLINT;
  years  SMALLINT[] := '{}';
BEGIN
  -- Resolve AM UUIDs
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    old_am := public.get_am_uuid_for_user(OLD.created_by_user_uuid);
  END IF;
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    new_am := public.get_am_uuid_for_user(NEW.created_by_user_uuid);
  END IF;

  -- Collect affected years from OLD row
  IF old_am IS NOT NULL THEN
    IF OLD.created_at IS NOT NULL THEN
      years := years || EXTRACT(YEAR FROM OLD.created_at)::SMALLINT;
    END IF;
    IF OLD.booked_at IS NOT NULL THEN
      years := years || EXTRACT(YEAR FROM OLD.booked_at)::SMALLINT;
    END IF;
    IF OLD.event_start IS NOT NULL THEN
      years := years || EXTRACT(YEAR FROM OLD.event_start)::SMALLINT;
    END IF;

    FOREACH yr IN ARRAY years LOOP
      PERFORM public.recompute_sales_scorecard_bucket(old_am, yr);
    END LOOP;
  END IF;

  -- Collect affected years from NEW row (skip buckets already recomputed above)
  IF new_am IS NOT NULL THEN
    years := '{}';
    IF NEW.created_at IS NOT NULL THEN
      years := years || EXTRACT(YEAR FROM NEW.created_at)::SMALLINT;
    END IF;
    IF NEW.booked_at IS NOT NULL THEN
      years := years || EXTRACT(YEAR FROM NEW.booked_at)::SMALLINT;
    END IF;
    IF NEW.event_start IS NOT NULL THEN
      years := years || EXTRACT(YEAR FROM NEW.event_start)::SMALLINT;
    END IF;

    FOREACH yr IN ARRAY years LOOP
      IF TG_OP = 'INSERT' OR new_am IS DISTINCT FROM old_am THEN
        PERFORM public.recompute_sales_scorecard_bucket(new_am, yr);
      ELSIF TG_OP = 'UPDATE' THEN
        IF NOT (yr = ANY(
          ARRAY[
            EXTRACT(YEAR FROM OLD.created_at)::SMALLINT,
            EXTRACT(YEAR FROM OLD.booked_at)::SMALLINT,
            EXTRACT(YEAR FROM OLD.event_start)::SMALLINT
          ]
        )) THEN
          PERFORM public.recompute_sales_scorecard_bucket(new_am, yr);
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_sales_scorecard_on_event
  AFTER INSERT OR UPDATE OR DELETE ON public."Events"
  FOR EACH ROW EXECUTE FUNCTION public.sync_sales_scorecard_on_event();


-- ============================================================================
-- Trigger on WorkTrackers: keep COGS in sync
-- ============================================================================
--
-- When a WorkTracker changes, recompute the AM bucket via driver -> AM link.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_sales_scorecard_on_worktracker()
RETURNS TRIGGER AS $$
DECLARE
  old_am   UUID     := NULL;
  old_year SMALLINT := NULL;
  new_am   UUID     := NULL;
  new_year SMALLINT := NULL;
BEGIN
  -- OLD bucket
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    IF OLD.driver_uuid IS NOT NULL AND OLD.date IS NOT NULL THEN
      SELECT d.account_manager_uuid INTO old_am
      FROM public."Drivers" d WHERE d.id = OLD.driver_uuid;
      old_year := EXTRACT(YEAR FROM OLD.date)::SMALLINT;
      IF old_am IS NOT NULL THEN
        PERFORM public.recompute_sales_scorecard_bucket(old_am, old_year);
      END IF;
    END IF;
  END IF;

  -- NEW bucket (skip if same as OLD)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.driver_uuid IS NOT NULL AND NEW.date IS NOT NULL THEN
      SELECT d.account_manager_uuid INTO new_am
      FROM public."Drivers" d WHERE d.id = NEW.driver_uuid;
      new_year := EXTRACT(YEAR FROM NEW.date)::SMALLINT;
      IF new_am IS NOT NULL THEN
        IF new_am IS DISTINCT FROM old_am OR new_year IS DISTINCT FROM old_year THEN
          PERFORM public.recompute_sales_scorecard_bucket(new_am, new_year);
        END IF;
      END IF;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_sales_scorecard_on_worktracker
  AFTER INSERT OR UPDATE OR DELETE ON public."WorkTrackers"
  FOR EACH ROW EXECUTE FUNCTION public.sync_sales_scorecard_on_worktracker();


-- ============================================================================
-- Backfill existing data
-- ============================================================================
--
-- For each AM, collect all distinct years from their Events (all 3 date fields)
-- and WorkTrackers, then recompute each bucket.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT am.id AS am_uuid, yr
    FROM public."AccountManagers" am
    INNER JOIN public."Users" u ON u.id = am.user_uuid
    CROSS JOIN LATERAL (
      SELECT EXTRACT(YEAR FROM e.created_at)::SMALLINT AS yr
      FROM public."Events" e
      WHERE e.created_by_user_uuid = u.id AND e.created_at IS NOT NULL
      UNION
      SELECT EXTRACT(YEAR FROM e.booked_at)::SMALLINT
      FROM public."Events" e
      WHERE e.created_by_user_uuid = u.id AND e.booked_at IS NOT NULL
      UNION
      SELECT EXTRACT(YEAR FROM e.event_start)::SMALLINT
      FROM public."Events" e
      WHERE e.created_by_user_uuid = u.id AND e.event_start IS NOT NULL
      UNION
      SELECT EXTRACT(YEAR FROM wt.date)::SMALLINT
      FROM public."WorkTrackers" wt
      INNER JOIN public."Drivers" d ON d.id = wt.driver_uuid
      WHERE d.account_manager_uuid = am.id AND wt.date IS NOT NULL
    ) sub
    WHERE yr IS NOT NULL
  LOOP
    PERFORM public.recompute_sales_scorecard_bucket(r.am_uuid, r.yr);
  END LOOP;
END;
$$;
