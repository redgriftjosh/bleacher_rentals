"use client";

import { useMemo } from "react";
import { roundToTwo } from "../../util/math";
import { useScorecardStatsContext } from "../ScorecardStatsContext";

type GrossMarginData = {
  thisPeriod: {
    current: number;
    goal: number;
  };
  lastPeriod: {
    value: number;
  };
};

export function useGrossMarginData(): GrossMarginData {
  const { allStats, thisPeriodDays, lastPeriodDays, getGoal } = useScorecardStatsContext();

  const goal = getGoal("gross_margin_percent");

  const thisPeriodDaySet = useMemo(() => new Set(thisPeriodDays), [thisPeriodDays]);
  const lastPeriodDaySet = useMemo(() => new Set(lastPeriodDays), [lastPeriodDays]);

  const { thisRevenue, thisDriverPay, lastRevenue, lastDriverPay } = useMemo(() => {
    let thisRev = 0;
    let thisDp = 0;
    let lastRev = 0;
    let lastDp = 0;

    for (const stat of allStats) {
      if (!stat.stat_date) continue;
      if (thisPeriodDaySet.has(stat.stat_date)) {
        thisRev += (stat.revenue_cents ?? 0) / 100;
        thisDp += (stat.driver_pay_cents ?? 0) / 100;
      } else if (lastPeriodDaySet.has(stat.stat_date)) {
        lastRev += (stat.revenue_cents ?? 0) / 100;
        lastDp += (stat.driver_pay_cents ?? 0) / 100;
      }
    }

    return { thisRevenue: thisRev, thisDriverPay: thisDp, lastRevenue: lastRev, lastDriverPay: lastDp };
  }, [allStats, thisPeriodDaySet, lastPeriodDaySet]);

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
