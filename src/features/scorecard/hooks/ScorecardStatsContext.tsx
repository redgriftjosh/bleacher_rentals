"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { TimeRange, validTimeRanges } from "./queries/useEventsWithinTimeRange";
import { useScorecardStats, type ScorecardStatRow } from "./queries/useScorecardStats";
import { getDayKeysForTimeRange } from "../util/quotes";
import { getCurrentDay, getLastPeriodSameElapsedDayKey } from "../util/datetime";
import { useTargets, type ScorecardTarget, type TargetType } from "./queries/useTargets";

type ScorecardStatsContextValue = {
  allStats: ScorecardStatRow[];
  activeRange: TimeRange;
  currentDay: string;
  thisPeriodDays: string[];
  lastPeriodDays: string[];
  lastPeriodSameElapsedDayKey: string;
  targets: ScorecardTarget[];
  getGoal: (targetType: TargetType) => number;
};

const ScorecardStatsContext = createContext<ScorecardStatsContextValue | null>(null);

export function ScorecardStatsProvider({ children }: { children: ReactNode }) {
  const currentDay = useMemo(() => getCurrentDay(), []);
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const activeRange: TimeRange = validTimeRanges.includes(timeRangeParam as TimeRange)
    ? (timeRangeParam as TimeRange)
    : "weekly";

  const allStats = useScorecardStats(activeRange);
  const { targets } = useTargets(activeRange, "quotes");

  const thisPeriodDays = getDayKeysForTimeRange(activeRange, "this");
  const lastPeriodDays = getDayKeysForTimeRange(activeRange, "last");

  const lastPeriodSameElapsedDayKey = getLastPeriodSameElapsedDayKey(
    thisPeriodDays,
    lastPeriodDays,
    currentDay,
  );

  const getGoal = useMemo(() => {
    return (targetType: TargetType) => {
      const total = targets.reduce((sum, target) => {
        if (targetType === "gross_margin_percent") {
          if (activeRange === "weekly") return sum + (target.gross_margin_percent_weekly ?? 0);
          if (activeRange === "quarterly") return sum + (target.gross_margin_percent_quarterly ?? 0);
          return sum + (target.gross_margin_percent_annually ?? 0);
        }
        if (targetType === "quotes") {
          if (activeRange === "weekly") return sum + (target.quotes_weekly ?? 0);
          if (activeRange === "quarterly") return sum + (target.quotes_quarterly ?? 0);
          return sum + (target.quotes_annually ?? 0);
        }
        if (targetType === "sales") {
          if (activeRange === "weekly") return sum + (target.sales_weekly ?? 0);
          if (activeRange === "quarterly") return sum + (target.sales_quarterly ?? 0);
          return sum + (target.sales_annually ?? 0);
        }
        if (targetType === "value_of_sales") {
          if (activeRange === "weekly") return sum + (target.value_of_sales_weekly_cents ?? 0) / 100;
          if (activeRange === "quarterly")
            return sum + (target.value_of_sales_quarterly_cents ?? 0) / 100;
          return sum + (target.value_of_sales_annually_cents ?? 0) / 100;
        }
        if (activeRange === "weekly") return sum + (target.value_of_revenue_weekly_cents ?? 0) / 100;
        if (activeRange === "quarterly")
          return sum + (target.value_of_revenue_quarterly_cents ?? 0) / 100;
        return sum + (target.value_of_revenue_annually_cents ?? 0) / 100;
      }, 0);

      if (targetType === "gross_margin_percent" && targets.length > 0) {
        return Math.round(total / targets.length);
      }
      return total;
    };
  }, [targets, activeRange]);

  const value = useMemo(
    () => ({
      allStats,
      activeRange,
      currentDay,
      thisPeriodDays,
      lastPeriodDays,
      lastPeriodSameElapsedDayKey,
      targets,
      getGoal,
    }),
    [
      allStats,
      activeRange,
      currentDay,
      thisPeriodDays,
      lastPeriodDays,
      lastPeriodSameElapsedDayKey,
      targets,
      getGoal,
    ],
  );

  return (
    <ScorecardStatsContext.Provider value={value}>{children}</ScorecardStatsContext.Provider>
  );
}

export function useScorecardStatsContext() {
  const ctx = useContext(ScorecardStatsContext);
  if (!ctx) {
    throw new Error("useScorecardStatsContext must be used within ScorecardStatsProvider");
  }
  return ctx;
}
