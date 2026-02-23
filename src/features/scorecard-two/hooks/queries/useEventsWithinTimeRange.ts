"use client";

import { db } from "@/components/providers/SystemProvider";
import {
  lastQuarterStartTimeStampTZ,
  lastWeekStartTimeStampTZ,
  thisQuarterEndTimeStampTZ,
  thisQuarterStartTimeStampTZ,
  thisWeekEndTimeStampTZ,
  thisWeekStartTimeStampTZ,
} from "../../constants/time";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

export type EventWithDate = {
  id: string;
  created_at: string | null;
  contract_revenue_cents: number | null;
};

export type TimeRange = "weekly" | "quarterly";
export const validTimeRanges = ["weekly", "quarterly"] as const;

export function useEventsWithinTimeRange(
  activeRange: TimeRange,
  period: "this" | "last",
  onlyBooked?: boolean,
  createdByUserUuid?: string,
) {
  const query = useMemo(() => {
    let eventsBuilder = db
      .selectFrom("Events as e")
      .select([
        "e.id as id",
        "e.created_at as created_at",
        "e.contract_revenue_cents as contract_revenue_cents",
      ]);

    if (activeRange === "weekly") {
      if (period === "this") {
        eventsBuilder = eventsBuilder
          .where("e.created_at", ">=", thisWeekStartTimeStampTZ)
          .where("e.created_at", "<", thisWeekEndTimeStampTZ);
      } else {
        eventsBuilder = eventsBuilder
          .where("e.created_at", ">=", lastWeekStartTimeStampTZ)
          .where("e.created_at", "<", thisWeekStartTimeStampTZ);
      }
    } else if (activeRange === "quarterly") {
      if (period === "this") {
        eventsBuilder = eventsBuilder
          .where("e.created_at", ">=", thisQuarterStartTimeStampTZ)
          .where("e.created_at", "<", thisQuarterEndTimeStampTZ);
      } else {
        eventsBuilder = eventsBuilder
          .where("e.created_at", ">=", lastQuarterStartTimeStampTZ)
          .where("e.created_at", "<", thisQuarterStartTimeStampTZ);
      }
    }

    if (onlyBooked) {
      eventsBuilder = eventsBuilder.where("e.event_status", "=", "booked");
    }

    if (createdByUserUuid) {
      eventsBuilder = eventsBuilder.where("e.created_by_user_uuid", "=", createdByUserUuid);
    }

    return eventsBuilder.compile();
  }, [activeRange, period, onlyBooked, createdByUserUuid]);

  const { data: events = [] } = useTypedQuery(query, expect<EventWithDate>());

  return events;
}
