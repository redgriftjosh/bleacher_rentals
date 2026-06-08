"use client";

import { useMemo } from "react";
import { assembleChartData, getPaceForEachDay } from "../../util/quotes";
import { cumulativeEventCentsByDay } from "../../util/scorecardAggregation";
import { useScorecardStatsContext } from "../ScorecardStatsContext";
import { filterQuotesBookingsEvents } from "@/features/quotesAndBookings/utils/filterEvents";
import { filtersForTemplate } from "@/features/quotesAndBookings/utils/scorecardTemplates";

export function useRevenueData() {
  const { allEvents, activeRange, periodStart, currentDay, thisPeriodDays, lastPeriodDays, lastPeriodSameElapsedDayKey, getGoal, timezone } =
    useScorecardStatsContext();

  const goal = getGoal("value_of_revenue");

  const thisFiltered = useMemo(
    () => filterQuotesBookingsEvents(allEvents, filtersForTemplate("revenue", activeRange, "this", null, periodStart), timezone),
    [allEvents, activeRange, periodStart, timezone],
  );
  const lastFiltered = useMemo(
    () => filterQuotesBookingsEvents(allEvents, filtersForTemplate("revenue", activeRange, "last", null, periodStart), timezone),
    [allEvents, activeRange, periodStart, timezone],
  );

  const thisPeriodCumulativeByDay = useMemo(
    () => cumulativeEventCentsByDay(thisPeriodDays, thisFiltered, "event_start", "contract_revenue_cents", timezone),
    [thisPeriodDays, thisFiltered, timezone],
  );
  const lastPeriodCumulativeByDay = useMemo(
    () => cumulativeEventCentsByDay(lastPeriodDays, lastFiltered, "event_start", "contract_revenue_cents", timezone),
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
