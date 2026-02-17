"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { ScorecardData } from "./types";
import { sql } from "kysely";

type EventWithDate = {
  id: string;
  created_at: string | null;
};

type ScorecardTarget = {
  quotes_weekly: number | null;
};

/**
 * Get start and end of current week (Monday-Sunday) in user's timezone
 */
function getWeekBounds(date: Date) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday

  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

/**
 * Get start and end of last week
 */
function getLastWeekBounds(date: Date) {
  const thisWeek = getWeekBounds(date);
  const lastMonday = new Date(thisWeek.start);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const lastSunday = new Date(thisWeek.start);
  lastSunday.setDate(lastSunday.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);

  return { start: lastMonday, end: lastSunday };
}

/**
 * Get the current day of week (1=Monday, 7=Sunday)
 */
function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

export function useNumberOfQuotesSent(accountManagerUuid?: string): ScorecardData {
  const now = useMemo(() => new Date(), []);
  const thisWeek = useMemo(() => getWeekBounds(now), [now]);
  const lastWeek = useMemo(() => getLastWeekBounds(now), [now]);
  const currentDayOfWeek = useMemo(() => getCurrentDayOfWeek(), []);

  // Query all events created this week (optionally filtered by account manager)
  const thisWeekQuery = useMemo(() => {
    let query = db
      .selectFrom("Events as e")
      .select(["e.id as id", "e.created_at as created_at"])
      .where("e.created_at", ">=", thisWeek.start.toISOString())
      .where("e.created_at", "<=", thisWeek.end.toISOString());

    if (accountManagerUuid) {
      query = query.where("e.created_by_user_uuid", "=", accountManagerUuid);
    }

    return query.compile();
  }, [thisWeek.start, thisWeek.end, accountManagerUuid]);

  const { data: thisWeekEvents = [] } = useTypedQuery(thisWeekQuery, expect<EventWithDate>());

  // Query all events created last week (optionally filtered by account manager)
  const lastWeekQuery = useMemo(() => {
    let query = db
      .selectFrom("Events as e")
      .select(["e.id as id", "e.created_at as created_at"])
      .where("e.created_at", ">=", lastWeek.start.toISOString())
      .where("e.created_at", "<=", lastWeek.end.toISOString());

    if (accountManagerUuid) {
      query = query.where("e.created_by_user_uuid", "=", accountManagerUuid);
    }

    return query.compile();
  }, [lastWeek.start, lastWeek.end, accountManagerUuid]);

  const { data: lastWeekEvents = [] } = useTypedQuery(lastWeekQuery, expect<EventWithDate>());

  // Query scorecard targets — single manager or all active managers
  const targetsQuery = useMemo(() => {
    let query = db
      .selectFrom("ScorecardTargets as st")
      .innerJoin("AccountManagers as am", "am.id", "st.account_manager_uuid")
      .select(["st.quotes_weekly as quotes_weekly"])
      .where("am.is_active", "=", 1);

    if (accountManagerUuid) {
      query = query.where("am.id", "=", accountManagerUuid);
    }

    return query.compile();
  }, [accountManagerUuid]);

  const { data: targets = [] } = useTypedQuery(targetsQuery, expect<ScorecardTarget>());

  // Calculate total weekly goal
  const weeklyGoal = useMemo(() => {
    return targets.reduce((sum, target) => sum + (target.quotes_weekly ?? 0), 0);
  }, [targets]);

  // Group this week's events by day
  const thisWeekByDay = useMemo(() => {
    const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

    thisWeekEvents.forEach((event) => {
      if (!event.created_at) return;
      const date = new Date(event.created_at);
      const day = date.getDay();
      const dayNum = day === 0 ? 7 : day;
      byDay[dayNum]++;
    });

    return byDay;
  }, [thisWeekEvents]);

  // Group last week's events by day
  const lastWeekByDay = useMemo(() => {
    const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

    lastWeekEvents.forEach((event) => {
      if (!event.created_at) return;
      const date = new Date(event.created_at);
      const day = date.getDay();
      const dayNum = day === 0 ? 7 : day;
      byDay[dayNum]++;
    });

    return byDay;
  }, [lastWeekEvents]);

  // Calculate cumulative values
  const { thisWeekCumulative, lastWeekCumulative } = useMemo(() => {
    const thisWeekCum: Record<number, number> = {};
    const lastWeekCum: Record<number, number> = {};

    let thisSum = 0;
    let lastSum = 0;

    for (let i = 1; i <= 7; i++) {
      thisSum += thisWeekByDay[i];
      lastSum += lastWeekByDay[i];
      thisWeekCum[i] = thisSum;
      lastWeekCum[i] = lastSum;
    }

    return { thisWeekCumulative: thisWeekCum, lastWeekCumulative: lastWeekCum };
  }, [thisWeekByDay, lastWeekByDay]);

  // Calculate pace (goal divided by 5 weekdays, cumulative)
  const paceByDay = useMemo(() => {
    const dailyTarget = weeklyGoal / 5;
    const pace: Record<number, number> = {};

    for (let i = 1; i <= 7; i++) {
      if (i <= 5) {
        pace[i] = Math.round(dailyTarget * i);
      } else {
        pace[i] = weeklyGoal; // Sat/Sun remain at full goal
      }
    }

    return pace;
  }, [weeklyGoal]);

  // Build chart data
  const chartData = useMemo(() => {
    const dayLabels = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const dayShort = ["M", "T", "W", "T", "F", "S", "S"];

    return dayLabels.map((label, idx) => {
      const dayNum = idx + 1;
      return {
        day: dayShort[idx],
        dayLabel: label,
        thisWeek: dayNum <= currentDayOfWeek ? thisWeekCumulative[dayNum] : null,
        lastWeek: lastWeekCumulative[dayNum],
        pace: paceByDay[dayNum],
      };
    });
  }, [currentDayOfWeek, thisWeekCumulative, lastWeekCumulative, paceByDay]);

  return {
    thisWeek: {
      current: thisWeekCumulative[currentDayOfWeek] ?? 0,
      goal: weeklyGoal,
      paceTarget: paceByDay[currentDayOfWeek] ?? 0,
      dayOfWeek: currentDayOfWeek,
    },
    lastWeek: {
      totalAtEnd: lastWeekCumulative[7] ?? 0,
      paceAtDay: lastWeekCumulative[currentDayOfWeek] ?? 0,
      goal: weeklyGoal, // Assuming same goal structure last week
      dayOfWeek: currentDayOfWeek,
    },
    chartData,
    label: "Quotes Sent",
  };
}
