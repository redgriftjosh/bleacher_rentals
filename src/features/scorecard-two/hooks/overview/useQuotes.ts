"use client";
import { useMemo } from "react";
import { getCurrentDay, getLastPeriodSameElapsedDayKey } from "../../util/datetime";
import { useSearchParams } from "next/navigation";
import {
  TimeRange,
  useEventsWithinTimeRange,
  validTimeRanges,
} from "../queries/useEventsWithinTimeRange";
import { useTargets } from "../queries/useTargets";
import {
  assembleChartData,
  getDayKeysForTimeRange,
  getGoalFromTargets,
  getNumberForEachDay,
  getPaceForEachDay,
} from "../../util/quotes";

export function useQuotes(onlyBooked?: boolean, useValue?: boolean, createdByUserUuid?: string) {
  const currentDay = useMemo(() => getCurrentDay(), []);
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const activeRange: TimeRange = validTimeRanges.includes(timeRangeParam as TimeRange)
    ? (timeRangeParam as TimeRange)
    : "weekly";

  const thisPeriodEvents = useEventsWithinTimeRange(
    activeRange,
    "this",
    onlyBooked,
    createdByUserUuid,
  );
  const lastPeriodEvents = useEventsWithinTimeRange(
    activeRange,
    "last",
    onlyBooked,
    createdByUserUuid,
  );
  const targets = useTargets();

  const goal = getGoalFromTargets(targets, activeRange);

  const thisPeriodDays = getDayKeysForTimeRange(activeRange, "this");
  const lastPeriodDays = getDayKeysForTimeRange(activeRange, "last");
  const lastPeriodSameElapsedDayKey = getLastPeriodSameElapsedDayKey(
    thisPeriodDays,
    lastPeriodDays,
    currentDay,
  );

  const thisPeriodCumulativeByDay = getNumberForEachDay(thisPeriodDays, thisPeriodEvents, useValue);
  const lastPeriodCumulativeByDay = getNumberForEachDay(lastPeriodDays, lastPeriodEvents, useValue);
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
      current: thisPeriodCumulativeByDay[currentDay] || 0,
      goal: goal,
      paceTarget: paceByDay[currentDay] || 0,
    },
    lastPeriod: {
      currentAtSameDay: lastPeriodSameElapsedDayKey
        ? lastPeriodCumulativeByDay[lastPeriodSameElapsedDayKey] || 0
        : 0,
      totalAtEnd: lastPeriodCumulativeByDay[lastPeriodDays[lastPeriodDays.length - 1]] || 0,
    },
    chartData,
  };
}
