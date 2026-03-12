"use client";

import { db } from "@/components/providers/SystemProvider";
import {
  lastQuarterStartDate,
  lastQuarterStartTimeStampTZ,
  lastWeekStartDate,
  lastWeekStartTimeStampTZ,
  lastYearStartDate,
  lastYearStartTimeStampTZ,
  thisQuarterEndDate,
  thisQuarterEndTimeStampTZ,
  thisQuarterStartDate,
  thisQuarterStartTimeStampTZ,
  thisWeekEndDate,
  thisWeekEndTimeStampTZ,
  thisWeekStartDate,
  thisWeekStartTimeStampTZ,
  thisYearEndDate,
  thisYearEndTimeStampTZ,
  thisYearStartDate,
  thisYearStartTimeStampTZ,
} from "../../constants/time";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import { DateField } from "../overview/useEventData";

export type EventWithDate = {
  id: string;
  created_at: string | null;
  event_start: string | null;
  contract_revenue_cents: number | null;
};

export type TimeRange = "weekly" | "quarterly" | "annually";
export const validTimeRanges = ["weekly", "quarterly", "annually"] as const;

export function useEventsWithinTimeRange(
  activeRange: TimeRange,
  period: "this" | "last",
  dateField: DateField,
  onlyBooked: boolean,
  createdByUserUuid: string | null,
) {
  const query = useMemo(() => {
    let eventsBuilder = db
      .selectFrom("Events as e")
      .select([
        "e.id as id",
        "e.created_at as created_at",
        "e.event_start as event_start",
        "e.contract_revenue_cents as contract_revenue_cents",
      ]);

    if (activeRange === "annually") {
      if (period === "this") {
        eventsBuilder = eventsBuilder
          .where(
            `e.${dateField}`,
            ">=",
            dateField === "created_at" ? thisYearStartTimeStampTZ : thisYearStartDate,
          )
          .where(
            `e.${dateField}`,
            "<",
            dateField === "created_at" ? thisYearEndTimeStampTZ : thisYearEndDate,
          );
      } else {
        eventsBuilder = eventsBuilder
          .where(
            `e.${dateField}`,
            ">=",
            dateField === "created_at" ? lastYearStartTimeStampTZ : lastYearStartDate,
          )
          .where(
            `e.${dateField}`,
            "<",
            dateField === "created_at" ? thisYearStartTimeStampTZ : thisYearStartDate,
          );
      }
    } else if (activeRange === "quarterly") {
      if (period === "this") {
        eventsBuilder = eventsBuilder
          .where(
            `e.${dateField}`,
            ">=",
            dateField === "created_at" ? thisQuarterStartTimeStampTZ : thisQuarterStartDate,
          )
          .where(
            `e.${dateField}`,
            "<",
            dateField === "created_at" ? thisQuarterEndTimeStampTZ : thisQuarterEndDate,
          );
      } else {
        eventsBuilder = eventsBuilder
          .where(
            `e.${dateField}`,
            ">=",
            dateField === "created_at" ? lastQuarterStartTimeStampTZ : lastQuarterStartDate,
          )
          .where(
            `e.${dateField}`,
            "<",
            dateField === "created_at" ? thisQuarterStartTimeStampTZ : thisQuarterStartDate,
          );
      }
      // default to weekly if somehow an invalid range is passed
    } else {
      if (period === "this") {
        eventsBuilder = eventsBuilder
          .where(
            `e.${dateField}`,
            ">=",
            dateField === "created_at" ? thisWeekStartTimeStampTZ : thisWeekStartDate,
          )
          .where(
            `e.${dateField}`,
            "<",
            dateField === "created_at" ? thisWeekEndTimeStampTZ : thisWeekEndDate,
          );
      } else {
        eventsBuilder = eventsBuilder
          .where(
            `e.${dateField}`,
            ">=",
            dateField === "created_at" ? lastWeekStartTimeStampTZ : lastWeekStartDate,
          )
          .where(
            `e.${dateField}`,
            "<",
            dateField === "created_at" ? thisWeekStartTimeStampTZ : thisWeekStartDate,
          );
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
