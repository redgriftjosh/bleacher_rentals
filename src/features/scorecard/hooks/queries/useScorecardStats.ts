"use client";

import { db } from "@/components/providers/SystemProvider";
import {
  lastQuarterStartDate,
  lastWeekStartDate,
  lastYearStartDate,
  thisQuarterEndDate,
  thisWeekEndDate,
  thisYearEndDate,
} from "../../constants/time";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import { TimeRange } from "./useEventsWithinTimeRange";

export type ScorecardStatRow = {
  id: string;
  account_manager_uuid: string | null;
  stat_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  quotes_sent: number | null;
  quotes_signed_count: number | null;
  quotes_signed_value_cents: number | null;
  revenue_cents: number | null;
  driver_pay_cents: number | null;
};

function getDateBounds(activeRange: TimeRange): { start: string; end: string } {
  if (activeRange === "annually") {
    return { start: lastYearStartDate, end: thisYearEndDate };
  }
  if (activeRange === "quarterly") {
    return { start: lastQuarterStartDate, end: thisQuarterEndDate };
  }
  return { start: lastWeekStartDate, end: thisWeekEndDate };
}

/**
 * Single reactive query for all scorecard stats across both periods.
 * Every derived hook (driver pay, revenue, etc.) reads from this one result set.
 */
export function useScorecardStats(activeRange: TimeRange) {
  const { start, end } = getDateBounds(activeRange);

  const query = useMemo(() => {
    return db
      .selectFrom("SalesScorecardDailyAccountManagerStats as ssdams")
      .select([
        "ssdams.id as id",
        "ssdams.account_manager_uuid as account_manager_uuid",
        "ssdams.stat_date as stat_date",
        "ssdams.created_at as created_at",
        "ssdams.updated_at as updated_at",
        "ssdams.quotes_sent as quotes_sent",
        "ssdams.quotes_signed_count as quotes_signed_count",
        "ssdams.quotes_signed_value_cents as quotes_signed_value_cents",
        "ssdams.revenue_cents as revenue_cents",
        "ssdams.driver_pay_cents as driver_pay_cents",
      ])
      .where("ssdams.stat_date", ">=", start)
      .where("ssdams.stat_date", "<", end)
      .compile();
  }, [activeRange]);

  const { data: stats = [] } = useTypedQuery(query, expect<ScorecardStatRow>());

  return stats;
}
