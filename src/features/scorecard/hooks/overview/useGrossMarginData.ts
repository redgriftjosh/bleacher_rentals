"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { roundToTwo } from "../../util/math";
import {
  TimeRange,
  useEventsWithinTimeRange,
  validTimeRanges,
} from "../queries/useEventsWithinTimeRange";
import { useWorkTrackersWithinTimeRange } from "../queries/useWorkTrackersWithinTimeRange";
import { useTargets } from "../queries/useTargets";

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
 * Gross Margin = (Revenue - COGS) / Revenue * 100
 *
 * Revenue: sum of contract_revenue_cents for booked events with event_start in the period.
 * COGS:    sum of pay_cents for work trackers with date in the period.
 */
export function useGrossMarginData(props: {
  createdByUserUuid: string | null;
  accountManagerUuid: string | null;
}): GrossMarginData {
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const activeRange: TimeRange = validTimeRanges.includes(timeRangeParam as TimeRange)
    ? (timeRangeParam as TimeRange)
    : "weekly";

  const thisPeriodEvents = useEventsWithinTimeRange(
    activeRange,
    "this",
    "event_start",
    true,
    props.createdByUserUuid,
  );
  const lastPeriodEvents = useEventsWithinTimeRange(
    activeRange,
    "last",
    "event_start",
    true,
    props.createdByUserUuid,
  );
  const thisPeriodWorkTrackers = useWorkTrackersWithinTimeRange(
    activeRange,
    "this",
    props.accountManagerUuid,
  );
  const lastPeriodWorkTrackers = useWorkTrackersWithinTimeRange(
    activeRange,
    "last",
    props.accountManagerUuid,
  );

  const { goal } = useTargets(activeRange, "gross_margin_percent", props.accountManagerUuid);

  const thisRevenue = useMemo(
    () => thisPeriodEvents.reduce((sum, e) => sum + (e.contract_revenue_cents ?? 0) / 100, 0),
    [thisPeriodEvents],
  );
  const thisCOGS = useMemo(
    () => thisPeriodWorkTrackers.reduce((sum, wt) => sum + (wt.pay_cents ?? 0) / 100, 0),
    [thisPeriodWorkTrackers],
  );
  const lastRevenue = useMemo(
    () => lastPeriodEvents.reduce((sum, e) => sum + (e.contract_revenue_cents ?? 0) / 100, 0),
    [lastPeriodEvents],
  );
  const lastCOGS = useMemo(
    () => lastPeriodWorkTrackers.reduce((sum, wt) => sum + (wt.pay_cents ?? 0) / 100, 0),
    [lastPeriodWorkTrackers],
  );

  const currentMarginRaw = roundToTwo(((thisRevenue - thisCOGS) / thisRevenue) * 100);
  const lastMarginRaw = roundToTwo(((lastRevenue - lastCOGS) / lastRevenue) * 100);
  const currentMargin = isFinite(currentMarginRaw) ? currentMarginRaw : 0;
  const lastMargin = isFinite(lastMarginRaw) ? lastMarginRaw : 0;

  console.log("current margin", currentMargin, "last margin", lastMargin, "goal", goal);

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
