"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentDay, getLastPeriodSameElapsedDayKey } from "../../util/datetime";
import { TimeRange, validTimeRanges } from "../queries/useEventsWithinTimeRange";
import { assembleChartData, getDayKeysForTimeRange, getPaceForEachDay } from "../../util/quotes";
import {
  StatsWithDate,
  useSalesScorecardDailyAccountManagerStats,
} from "../queries/useSalesScorecardDailyAccountManagerStats";

/**
 * Aggregates driver pay cents from daily stats rows into a cumulative-per-day map.
 * Multiple rows per day (one per account manager) are summed together.
 * Uses the same useMemo-inside-function pattern as getNumberForEachDay in quotes.ts.
 */
function getDriverPayCumulativeByDay(
  days: string[],
  stats: StatsWithDate[],
): Record<string, number> {
  return useMemo(() => {
    const daily: Record<string, number> = {};
    const cumulative: Record<string, number> = {};
    const daySet = new Set(days);

    days.forEach((day) => {
      daily[day] = 0;
    });

    stats.forEach((stat) => {
      if (!stat.stat_date || !daySet.has(stat.stat_date)) return;
      daily[stat.stat_date] += (stat.driver_pay_cents ?? 0) / 100;
    });

    let runningTotal = 0;
    days.forEach((day) => {
      runningTotal += daily[day] ?? 0;
      cumulative[day] = runningTotal;
    });

    return cumulative;
  }, [days, stats]);
}

export function useDriverPayData() {
  const currentDay = useMemo(() => getCurrentDay(), []);
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const activeRange: TimeRange = validTimeRanges.includes(timeRangeParam as TimeRange)
    ? (timeRangeParam as TimeRange)
    : "weekly";

  const thisPeriodStats = useSalesScorecardDailyAccountManagerStats(activeRange, "this");
  const lastPeriodStats = useSalesScorecardDailyAccountManagerStats(activeRange, "last");

  const thisPeriodDays = getDayKeysForTimeRange(activeRange, "this");
  const lastPeriodDays = getDayKeysForTimeRange(activeRange, "last");

  const lastPeriodSameElapsedDayKey = getLastPeriodSameElapsedDayKey(
    thisPeriodDays,
    lastPeriodDays,
    currentDay,
  );

  const thisPeriodCumulativeByDay = getDriverPayCumulativeByDay(thisPeriodDays, thisPeriodStats);
  const lastPeriodCumulativeByDay = getDriverPayCumulativeByDay(lastPeriodDays, lastPeriodStats);
  // No goal exists for driver pay yet — pace line will be flat at 0
  const paceByDay = getPaceForEachDay(thisPeriodDays, 0);

  const chartData = assembleChartData(
    activeRange,
    thisPeriodDays,
    lastPeriodDays,
    currentDay,
    thisPeriodCumulativeByDay,
    lastPeriodCumulativeByDay,
    paceByDay,
  );

  return {
    thisPeriod: {
      current: thisPeriodCumulativeByDay[currentDay] ?? 0,
      goal: 0,
      paceTarget: 0,
    },
    lastPeriod: {
      currentAtSameDay: lastPeriodSameElapsedDayKey
        ? (lastPeriodCumulativeByDay[lastPeriodSameElapsedDayKey] ?? 0)
        : 0,
      totalAtEnd: lastPeriodCumulativeByDay[lastPeriodDays[lastPeriodDays.length - 1]] ?? 0,
    },
    chartData,
  };
}
