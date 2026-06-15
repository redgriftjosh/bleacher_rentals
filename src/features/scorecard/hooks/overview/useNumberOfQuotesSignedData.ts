"use client";

import { useMemo } from "react";
import { assembleChartData, getPaceForEachDay } from "../../util/quotes";
import { cumulativeEventCountByDay } from "../../util/scorecardAggregation";
import { useScorecardStatsContext } from "../ScorecardStatsContext";
import { filterQuotesBookingsEvents } from "@/features/quotesAndBookings/utils/filterEvents";
import { filtersForTemplate } from "@/features/quotesAndBookings/utils/scorecardTemplates";

export function useNumberOfQuotesSignedData() {
  const { allEvents, activeRange, periodStart, currentDay, thisPeriodDays, lastPeriodDays, lastPeriodSameElapsedDayKey, getGoal, timezone } =
    useScorecardStatsContext();

  const goal = getGoal("sales");

  const thisFiltered = useMemo(
    () => filterQuotesBookingsEvents(allEvents, filtersForTemplate("quotes-signed", activeRange, "this", null, periodStart), timezone),
    [allEvents, activeRange, periodStart, timezone],
  );
  const lastFiltered = useMemo(
    () => filterQuotesBookingsEvents(allEvents, filtersForTemplate("quotes-signed", activeRange, "last", null, periodStart), timezone),
    [allEvents, activeRange, periodStart, timezone],
  );

  const thisPeriodCumulativeByDay = useMemo(
    () => cumulativeEventCountByDay(thisPeriodDays, thisFiltered, "booked_at", timezone),
    [thisPeriodDays, thisFiltered, timezone],
  );
  const lastPeriodCumulativeByDay = useMemo(
    () => cumulativeEventCountByDay(lastPeriodDays, lastFiltered, "booked_at", timezone),
    [lastPeriodDays, lastFiltered, timezone],
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
