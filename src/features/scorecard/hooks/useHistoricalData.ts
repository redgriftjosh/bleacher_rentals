"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import type { MonthlyRevenueData } from "../db";
import type { TimeRange } from "../types";
import {
  getWeekRange,
  getQuarterRange,
  getCurrentQuarter,
  formatWeekLabel,
  formatQuarterLabel,
} from "../dateUtils";

type EventRow = {
  createdAt: string | null;
  eventStart: string | null;
  eventStatus: string | null;
  contractRevenueCents: number | null;
  createdByUserUuid: string | null;
};

const allEventsQuery = db
  .selectFrom("Events as e")
  .select([
    "e.created_at as createdAt",
    "e.event_start as eventStart",
    "e.event_status as eventStatus",
    "e.contract_revenue_cents as contractRevenueCents",
    "e.created_by_user_uuid as createdByUserUuid",
  ])
  .compile();

function isInRange(dateStr: string | null, start: string, end: string): boolean {
  if (!dateStr) return false;
  const dateOnly = dateStr.substring(0, 10);
  return dateOnly >= start && dateOnly <= end;
}

/**
 * Returns historical revenue data points for the line graph.
 * - Weekly: shows last 12 weeks of revenue
 * - Quarterly: shows all quarters of current year
 * - Annually: shows monthly revenue for current year
 */
export function useHistoricalData(
  userUuid: string,
  timeRange: TimeRange,
): MonthlyRevenueData[] {
  const { data: eventRows } = useTypedQuery(allEventsQuery, expect<EventRow>());

  return useMemo(() => {
    const events = (eventRows ?? []).filter((e) => e.createdByUserUuid === userUuid);

    if (timeRange === "weekly") {
      // Last 12 weeks
      const points: MonthlyRevenueData[] = [];
      for (let i = -11; i <= 0; i++) {
        const range = getWeekRange(i);
        let revenue = 0;
        let count = 0;
        for (const e of events) {
          if (e.eventStatus === "booked" && isInRange(e.eventStart, range.start, range.end)) {
            revenue += (e.contractRevenueCents ?? 0) / 100;
            count++;
          }
        }
        points.push({
          month: formatWeekLabel(range.start, range.end),
          revenue,
          eventCount: count,
        });
      }
      return points;
    }

    if (timeRange === "quarterly") {
      const year = new Date().getFullYear();
      const currentQ = getCurrentQuarter();
      const points: MonthlyRevenueData[] = [];
      for (let q = 1; q <= currentQ; q++) {
        const range = getQuarterRange(year, q);
        let revenue = 0;
        let count = 0;
        for (const e of events) {
          if (e.eventStatus === "booked" && isInRange(e.eventStart, range.start, range.end)) {
            revenue += (e.contractRevenueCents ?? 0) / 100;
            count++;
          }
        }
        points.push({
          month: formatQuarterLabel(year, q),
          revenue,
          eventCount: count,
        });
      }
      return points;
    }

    // Annually: show monthly
    const year = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const points: MonthlyRevenueData[] = [];
    for (let m = 0; m <= currentMonth; m++) {
      const start = `${year}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, m + 1, 0).getDate();
      const end = `${year}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      let revenue = 0;
      let count = 0;
      for (const e of events) {
        if (e.eventStatus === "booked" && isInRange(e.eventStart, start, end)) {
          revenue += (e.contractRevenueCents ?? 0) / 100;
          count++;
        }
      }
      const monthName = new Date(year, m, 1).toLocaleDateString("en-US", { month: "short" });
      points.push({ month: monthName, revenue, eventCount: count });
    }
    return points;
  }, [eventRows, userUuid, timeRange]);
}
