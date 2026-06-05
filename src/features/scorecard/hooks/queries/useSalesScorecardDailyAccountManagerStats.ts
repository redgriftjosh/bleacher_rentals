"use client";

import { db } from "@/components/providers/SystemProvider";
import {
  lastQuarterStartDate,
  lastWeekStartDate,
  lastYearStartDate,
  thisQuarterEndDate,
  thisQuarterStartDate,
  thisWeekEndDate,
  thisWeekStartDate,
  thisYearEndDate,
  thisYearStartDate,
} from "../../constants/time";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import { TimeRange } from "./useEventsWithinTimeRange";

export type StatsWithDate = {
  id: string;
  stat_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  quotes_signed_value_cents: number | null;
  revenue_cents: number | null;
  driver_pay_cents: number | null;
};

export function useSalesScorecardDailyAccountManagerStats(
  activeRange: TimeRange,
  period: "this" | "last",
  accountManagerUuid?: string | null,
) {
  const query = useMemo(() => {
    let statsBuilder = db
      .selectFrom("SalesScorecardDailyAccountManagerStats as ssdams")
      .select([
        "ssdams.id as id",
        "ssdams.stat_date as stat_date",
        "ssdams.created_at as created_at",
        "ssdams.updated_at as updated_at",
        "ssdams.quotes_signed_value_cents as quotes_signed_value_cents",
        "ssdams.revenue_cents as revenue_cents",
        "ssdams.driver_pay_cents as driver_pay_cents",
      ]);

    if (accountManagerUuid) {
      statsBuilder = statsBuilder.where("ssdams.account_manager_uuid", "=", accountManagerUuid);
    }

    if (activeRange === "annually") {
      if (period === "this") {
        statsBuilder = statsBuilder
          .where("ssdams.stat_date", ">=", thisYearStartDate)
          .where("ssdams.stat_date", "<", thisYearEndDate);
      } else {
        statsBuilder = statsBuilder
          .where("ssdams.stat_date", ">=", lastYearStartDate)
          .where("ssdams.stat_date", "<", thisYearStartDate);
      }
    } else if (activeRange === "quarterly") {
      if (period === "this") {
        statsBuilder = statsBuilder
          .where("ssdams.stat_date", ">=", thisQuarterStartDate)
          .where("ssdams.stat_date", "<", thisQuarterEndDate);
      } else {
        statsBuilder = statsBuilder
          .where("ssdams.stat_date", ">=", lastQuarterStartDate)
          .where("ssdams.stat_date", "<", thisQuarterStartDate);
      }
    } else {
      // weekly (default)
      if (period === "this") {
        statsBuilder = statsBuilder
          .where("ssdams.stat_date", ">=", thisWeekStartDate)
          .where("ssdams.stat_date", "<", thisWeekEndDate);
      } else {
        statsBuilder = statsBuilder
          .where("ssdams.stat_date", ">=", lastWeekStartDate)
          .where("ssdams.stat_date", "<", thisWeekStartDate);
      }
    }

    return statsBuilder.compile();
  }, [activeRange, period]);

  const { data: stats = [] } = useTypedQuery(query, expect<StatsWithDate>());

  return stats;
}
