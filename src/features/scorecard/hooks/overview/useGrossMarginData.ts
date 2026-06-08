"use client";

import { useMemo } from "react";
import { roundToTwo } from "../../util/math";
import { cumulativeEventCentsByDay, cumulativeWorkTrackerPayByDay } from "../../util/scorecardAggregation";
import { useScorecardStatsContext } from "../ScorecardStatsContext";
import { filterQuotesBookingsEvents } from "@/features/quotesAndBookings/utils/filterEvents";
import { filtersForTemplate } from "@/features/quotesAndBookings/utils/scorecardTemplates";

type GrossMarginData = {
  thisPeriod: {
    current: number;
    goal: number;
    revenueDollars: number;
    driverPayDollars: number;
  };
  lastPeriod: {
    value: number;
  };
};

export function useGrossMarginData(): GrossMarginData {
  const { allEvents, allWorkTrackers, activeRange, periodStart, thisPeriodDays, lastPeriodDays, getGoal, timezone } =
    useScorecardStatsContext();

  const goal = getGoal("gross_margin_percent");

  // Revenue uses the same filter as the "revenue" template — status === "booked" + event_start in range
  const thisRevenueFiltered = useMemo(
    () => filterQuotesBookingsEvents(allEvents, filtersForTemplate("revenue", activeRange, "this", null, periodStart), timezone),
    [allEvents, activeRange, periodStart, timezone],
  );
  const lastRevenueFiltered = useMemo(
    () => filterQuotesBookingsEvents(allEvents, filtersForTemplate("revenue", activeRange, "last", null, periodStart), timezone),
    [allEvents, activeRange, periodStart, timezone],
  );

  const thisRevenueCumulative = useMemo(
    () => cumulativeEventCentsByDay(thisPeriodDays, thisRevenueFiltered, "event_start", "contract_revenue_cents", timezone),
    [thisPeriodDays, thisRevenueFiltered, timezone],
  );
  const lastRevenueCumulative = useMemo(
    () => cumulativeEventCentsByDay(lastPeriodDays, lastRevenueFiltered, "event_start", "contract_revenue_cents", timezone),
    [lastPeriodDays, lastRevenueFiltered, timezone],
  );

  const thisDriverPayCumulative = useMemo(
    () => cumulativeWorkTrackerPayByDay(thisPeriodDays, allWorkTrackers, timezone),
    [thisPeriodDays, allWorkTrackers, timezone],
  );
  const lastDriverPayCumulative = useMemo(
    () => cumulativeWorkTrackerPayByDay(lastPeriodDays, allWorkTrackers, timezone),
    [lastPeriodDays, allWorkTrackers, timezone],
  );

  const thisRevenue = thisRevenueCumulative[thisPeriodDays[thisPeriodDays.length - 1]] ?? 0;
  const thisDriverPay = thisDriverPayCumulative[thisPeriodDays[thisPeriodDays.length - 1]] ?? 0;
  const lastRevenue = lastRevenueCumulative[lastPeriodDays[lastPeriodDays.length - 1]] ?? 0;
  const lastDriverPay = lastDriverPayCumulative[lastPeriodDays[lastPeriodDays.length - 1]] ?? 0;

  const currentMarginRaw = roundToTwo(((thisRevenue - thisDriverPay) / thisRevenue) * 100);
  const lastMarginRaw = roundToTwo(((lastRevenue - lastDriverPay) / lastRevenue) * 100);
  const currentMargin = isFinite(currentMarginRaw) ? currentMarginRaw : 0;
  const lastMargin = isFinite(lastMarginRaw) ? lastMarginRaw : 0;

  return {
    thisPeriod: {
      current: currentMargin,
      goal,
      revenueDollars: thisRevenue,
      driverPayDollars: thisDriverPay,
    },
    lastPeriod: {
      value: lastMargin,
    },
  };
}
