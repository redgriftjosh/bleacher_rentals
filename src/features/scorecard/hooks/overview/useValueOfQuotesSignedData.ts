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
import { useTargets } from "../queries/useTargets";

function getValueOfQuotesSignedCumulativeByDay(
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
      daily[stat.stat_date] += (stat.quotes_signed_value_cents ?? 0) / 100;
    });

    let runningTotal = 0;
    days.forEach((day) => {
      runningTotal += daily[day] ?? 0;
      cumulative[day] = runningTotal;
    });

    return cumulative;
  }, [days, stats]);
}

export function useValueOfQuotesSignedData(accountManagerUuid?: string | null) {
  const currentDay = useMemo(() => getCurrentDay(), []);
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const activeRange: TimeRange = validTimeRanges.includes(timeRangeParam as TimeRange)
    ? (timeRangeParam as TimeRange)
    : "weekly";

  const thisPeriodStats = useSalesScorecardDailyAccountManagerStats(
    activeRange,
    "this",
    accountManagerUuid,
  );
  const lastPeriodStats = useSalesScorecardDailyAccountManagerStats(
    activeRange,
    "last",
    accountManagerUuid,
  );

  const { goal } = useTargets(activeRange, "value_of_sales", accountManagerUuid);

  const thisPeriodDays = getDayKeysForTimeRange(activeRange, "this");
  const lastPeriodDays = getDayKeysForTimeRange(activeRange, "last");

  const lastPeriodSameElapsedDayKey = getLastPeriodSameElapsedDayKey(
    thisPeriodDays,
    lastPeriodDays,
    currentDay,
  );

  const thisPeriodCumulativeByDay = getValueOfQuotesSignedCumulativeByDay(
    thisPeriodDays,
    thisPeriodStats,
  );
  const lastPeriodCumulativeByDay = getValueOfQuotesSignedCumulativeByDay(
    lastPeriodDays,
    lastPeriodStats,
  );
  const paceByDay = getPaceForEachDay(thisPeriodDays, goal);

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
      goal,
      paceTarget: paceByDay[currentDay] ?? 0,
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
