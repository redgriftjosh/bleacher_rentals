"use client";

import { useMemo } from "react";
import { assembleChartData, getPaceForEachDay } from "../../util/quotes";
import { cumulativeCentsByDay } from "../../util/scorecardAggregation";
import { useScorecardStatsContext } from "../ScorecardStatsContext";

export function useDriverPayData() {
  const { allStats, activeRange, currentDay, thisPeriodDays, lastPeriodDays, lastPeriodSameElapsedDayKey } =
    useScorecardStatsContext();

  const thisPeriodCumulativeByDay = useMemo(
    () => cumulativeCentsByDay(thisPeriodDays, allStats, "driver_pay_cents"),
    [thisPeriodDays, allStats],
  );
  const lastPeriodCumulativeByDay = useMemo(
    () => cumulativeCentsByDay(lastPeriodDays, allStats, "driver_pay_cents"),
    [lastPeriodDays, allStats],
  );

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
