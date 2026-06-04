"use client";

import { db } from "@/components/providers/SystemProvider";
import {
  lastQuarterStartDate,
  lastWeekStartDate,
  lastYearStartDate,
  thisQuarterEndDate,
  thisQuarterStartDate,
  thisWeekEndDate,
  thisWeekStartDate,
  thisYearEndDate,
  thisYearStartDate,
} from "../../constants/time";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import { TimeRange } from "./useEventsWithinTimeRange";

export type WorkTrackerWithDate = {
  id: string;
  date: string | null;
  pay_cents: number | null;
};

/**
 * Query work trackers within a time range, optionally filtered by account manager
 * (through the driver → account manager relationship).
 */
export function useWorkTrackersWithinTimeRange(
  activeRange: TimeRange,
  period: "this" | "last",
  accountManagerUuid: string | null,
) {
  const query = useMemo(() => {
    let builder = db
      .selectFrom("WorkTrackers as wt")
      .select(["wt.id as id", "wt.date as date", "wt.pay_cents as pay_cents"]);

    if (accountManagerUuid) {
      builder = builder
        .innerJoin("Drivers as d", "d.id", "wt.driver_uuid")
        .where("d.account_manager_uuid", "=", accountManagerUuid);
    }

    if (activeRange === "annually") {
      if (period === "this") {
        builder = builder
          .where("wt.date", ">=", thisYearStartDate)
          .where("wt.date", "<", thisYearEndDate);
      } else {
        builder = builder
          .where("wt.date", ">=", lastYearStartDate)
          .where("wt.date", "<", thisYearStartDate);
      }
    } else if (activeRange === "quarterly") {
      if (period === "this") {
        builder = builder
          .where("wt.date", ">=", thisQuarterStartDate)
          .where("wt.date", "<", thisQuarterEndDate);
      } else {
        builder = builder
          .where("wt.date", ">=", lastQuarterStartDate)
          .where("wt.date", "<", thisQuarterStartDate);
      }
    } else {
      if (period === "this") {
        builder = builder
          .where("wt.date", ">=", thisWeekStartDate)
          .where("wt.date", "<", thisWeekEndDate);
      } else {
        builder = builder
          .where("wt.date", ">=", lastWeekStartDate)
          .where("wt.date", "<", thisWeekStartDate);
      }
    }

    return builder.compile();
  }, [activeRange, period, accountManagerUuid]);

  const { data: workTrackers = [] } = useTypedQuery(query, expect<WorkTrackerWithDate>());

  return workTrackers;
}
