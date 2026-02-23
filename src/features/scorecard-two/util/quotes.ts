import { useMemo } from "react";
import { EventWithDate, TimeRange } from "../hooks/queries/useEventsWithinTimeRange";
import { ScorecardTarget } from "../hooks/queries/useTargets";
import {
  lastQuarterStartTimeStampTZ,
  lastWeekStartTimeStampTZ,
  thisQuarterEndTimeStampTZ,
  thisQuarterStartTimeStampTZ,
  thisWeekEndTimeStampTZ,
  thisWeekStartTimeStampTZ,
} from "../constants/time";
import { getDateKeys, isWeekdayKey, toLocalDateKey } from "./datetime";
import { roundToTwo } from "./math";

export function getGoalFromTargets(targets: ScorecardTarget[], timeRange: TimeRange): number {
  return useMemo(() => {
    if (timeRange === "weekly") {
      return targets.reduce((sum, target) => sum + (target.quotes_weekly ?? 0), 0);
    } else if (timeRange === "quarterly") {
      return targets.reduce((sum, target) => sum + (target.quotes_quarterly ?? 0), 0);
    } else if (timeRange === "annually") {
      // return targets.reduce((sum, target) => sum + (target.quotes_annual ?? 0), 0);
    }
    return targets.reduce((sum, target) => sum + (target.quotes_weekly ?? 0), 0);
  }, [timeRange, targets]);
}

export function getDayKeysForTimeRange(activeRange: TimeRange, period: "this" | "last"): string[] {
  if (activeRange === "quarterly") {
    if (period === "this") {
      return getDateKeys(thisQuarterStartTimeStampTZ, thisQuarterEndTimeStampTZ);
    } else {
      return getDateKeys(lastQuarterStartTimeStampTZ, thisQuarterStartTimeStampTZ);
    }
    // default to weekly if somehow an invalid range is passed
  } else {
    if (period === "this") {
      return getDateKeys(thisWeekStartTimeStampTZ, thisWeekEndTimeStampTZ);
    } else {
      return getDateKeys(lastWeekStartTimeStampTZ, thisWeekStartTimeStampTZ);
    }
  }
}

export function getNumberForEachDay(
  days: string[],
  events: EventWithDate[],
  useValue?: boolean,
): Record<string, number> {
  return useMemo(() => {
    const daily: Record<string, number> = {};
    const cumulative: Record<string, number> = {};
    const daySet = new Set(days);

    days.forEach((day) => {
      daily[day] = 0;
    });

    events.forEach((event) => {
      if (!event.created_at) return;
      const eventDateKey = toLocalDateKey(event.created_at);
      if (!daySet.has(eventDateKey)) return;

      const valueToAdd = useValue ? (event.contract_revenue_cents ?? 0) / 100 : 1;
      daily[eventDateKey] += valueToAdd;
    });

    let runningTotal = 0;
    days.forEach((day) => {
      runningTotal += daily[day] ?? 0;
      cumulative[day] = runningTotal;
    });

    return cumulative;
  }, [events, useValue, days]);
}

export function getPaceForEachDay(days: string[], goal: number) {
  return useMemo(() => {
    const pace: Record<string, number> = {};
    const totalWeekdays = days.filter(isWeekdayKey).length;
    const dailyTarget = totalWeekdays > 0 ? goal / totalWeekdays : 0;
    let running = 0;

    days.forEach((day) => {
      if (isWeekdayKey(day)) {
        running += dailyTarget;
      }
      pace[day] = roundToTwo(running); // weekend stays flat
    });
    return pace;
  }, [days, goal]);
}

export function assembleChartData(
  timeRange: TimeRange,
  thisPeriodDays: string[],
  lastPeriodDays: string[],
  currentDay: string,
  thisPeriodCumulative: Record<string, number>,
  lastPeriodCumulative: Record<string, number>,
  paceByDay: Record<string, number>,
) {
  return useMemo(() => {
    return thisPeriodDays.map((dateKey, idx) => {
      const d = new Date(`${dateKey}T00:00:00`);
      const lastPeriodDateKey = lastPeriodDays[idx];
      return {
        day: dateKey,
        dayTick: GetDayForXAxis(timeRange, dateKey),
        dayLabel: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }), // "January 12"
        thisPeriod: dateKey > currentDay ? null : (thisPeriodCumulative[dateKey] ?? 0), // this works as long as both strings are always in exact YYYY-MM-DD format with zero-padding (like 2026-01-01)
        lastPeriod: lastPeriodDateKey ? (lastPeriodCumulative[lastPeriodDateKey] ?? 0) : 0,
        pace: paceByDay[dateKey] ?? 0,
      };
    });
  }, [
    timeRange,
    thisPeriodDays,
    lastPeriodDays,
    currentDay,
    thisPeriodCumulative,
    lastPeriodCumulative,
    paceByDay,
  ]);
}

export function GetDayForXAxis(timeRange: TimeRange, dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);

  if (timeRange === "weekly") {
    const dayChars = ["S", "M", "T", "W", "T", "F", "S"];
    return dayChars[date.getDay()] ?? "";
  }

  return date.getDate() === 1 ? date.toLocaleDateString("en-US", { month: "short" }) : "";
}
