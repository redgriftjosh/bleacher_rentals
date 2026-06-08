"use client";

import { useMemo } from "react";
import { assembleChartData, getPaceForEachDay } from "../../util/quotes";
import { cumulativeWorkTrackerPayByDay } from "../../util/scorecardAggregation";
import { useScorecardStatsContext } from "../ScorecardStatsContext";

export function useDriverPayData() {
  const { allWorkTrackers, activeRange, currentDay, thisPeriodDays, lastPeriodDays, lastPeriodSameElapsedDayKey, timezone } =
    useScorecardStatsContext();

  const thisPeriodCumulativeByDay = useMemo(
    () => cumulativeWorkTrackerPayByDay(thisPeriodDays, allWorkTrackers, timezone),
    [thisPeriodDays, allWorkTrackers, timezone],
  );
  const lastPeriodCumulativeByDay = useMemo(
    () => cumulativeWorkTrackerPayByDay(lastPeriodDays, allWorkTrackers, timezone),
    [lastPeriodDays, allWorkTrackers, timezone],
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
