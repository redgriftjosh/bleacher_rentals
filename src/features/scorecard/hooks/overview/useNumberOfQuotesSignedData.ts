"use client";

import { useMemo } from "react";
import { assembleChartData, getPaceForEachDay } from "../../util/quotes";
import { cumulativeCountByDay } from "../../util/scorecardAggregation";
import { useScorecardStatsContext } from "../ScorecardStatsContext";

export function useNumberOfQuotesSignedData() {
  const { allStats, activeRange, currentDay, thisPeriodDays, lastPeriodDays, lastPeriodSameElapsedDayKey, getGoal } =
    useScorecardStatsContext();

  const goal = getGoal("sales");

  const thisPeriodCumulativeByDay = useMemo(
    () => cumulativeCountByDay(thisPeriodDays, allStats, "quotes_signed_count"),
    [thisPeriodDays, allStats],
  );
  const lastPeriodCumulativeByDay = useMemo(
    () => cumulativeCountByDay(lastPeriodDays, allStats, "quotes_signed_count"),
    [lastPeriodDays, allStats],
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
