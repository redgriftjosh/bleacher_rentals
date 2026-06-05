"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { roundToTwo } from "../../util/math";
import { TimeRange, validTimeRanges } from "../queries/useEventsWithinTimeRange";
import { useTargets } from "../queries/useTargets";
import { useSalesScorecardDailyAccountManagerStats } from "../queries/useSalesScorecardDailyAccountManagerStats";

type GrossMarginData = {
  thisPeriod: {
    current: number;
    goal: number;
  };
  lastPeriod: {
    value: number;
  };
};

/**
 * Gross Margin = (Revenue - Driver Pay) / Revenue * 100
 *
 * Revenue:    sum of revenue_cents from SalesScorecardDailyAccountManagerStats for the period.
 * Driver Pay: sum of driver_pay_cents from SalesScorecardDailyAccountManagerStats for the period.
 */
export function useGrossMarginData(props: { accountManagerUuid: string | null }): GrossMarginData {
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const activeRange: TimeRange = validTimeRanges.includes(timeRangeParam as TimeRange)
    ? (timeRangeParam as TimeRange)
    : "weekly";

  const thisPeriodStats = useSalesScorecardDailyAccountManagerStats(
    activeRange,
    "this",
    props.accountManagerUuid,
  );
  const lastPeriodStats = useSalesScorecardDailyAccountManagerStats(
    activeRange,
    "last",
    props.accountManagerUuid,
  );

  const { goal } = useTargets(activeRange, "gross_margin_percent", props.accountManagerUuid);

  const thisRevenue = useMemo(
    () => thisPeriodStats.reduce((sum, s) => sum + (s.revenue_cents ?? 0) / 100, 0),
    [thisPeriodStats],
  );
  const thisDriverPay = useMemo(
    () => thisPeriodStats.reduce((sum, s) => sum + (s.driver_pay_cents ?? 0) / 100, 0),
    [thisPeriodStats],
  );
  const lastRevenue = useMemo(
    () => lastPeriodStats.reduce((sum, s) => sum + (s.revenue_cents ?? 0) / 100, 0),
    [lastPeriodStats],
  );
  const lastDriverPay = useMemo(
    () => lastPeriodStats.reduce((sum, s) => sum + (s.driver_pay_cents ?? 0) / 100, 0),
    [lastPeriodStats],
  );

  const currentMarginRaw = roundToTwo(((thisRevenue - thisDriverPay) / thisRevenue) * 100);
  const lastMarginRaw = roundToTwo(((lastRevenue - lastDriverPay) / lastRevenue) * 100);
  const currentMargin = isFinite(currentMarginRaw) ? currentMarginRaw : 0;
  const lastMargin = isFinite(lastMarginRaw) ? lastMarginRaw : 0;

  return {
    thisPeriod: {
      current: currentMargin,
      goal,
    },
    lastPeriod: {
      value: lastMargin,
    },
  };
}
