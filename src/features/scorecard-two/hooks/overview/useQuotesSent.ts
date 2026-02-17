"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { DateTime } from "luxon";
import { lastWeekStart, thisWeekEnd, thisWeekStart } from "../../constants/time";
import { useMemo } from "react";
import { getCurrentDayOfWeek } from "../../util/datetime";

type EventWithDate = {
  id: string;
  created_at: string | null;
};

type ScorecardTarget = {
  quotes_weekly: number | null;
};

export function useQuotesSent() {
  const currentDayOfWeek = useMemo(() => getCurrentDayOfWeek(), []);
  const eventsThisWeekQuery = db
    .selectFrom("Events as e")
    .select(["e.id as id", "e.created_at as created_at"])
    .where("e.created_at", ">=", thisWeekStart)
    .where("e.created_at", "<", thisWeekEnd)
    .compile();

  const { data: thisWeekEvents = [] } = useTypedQuery(eventsThisWeekQuery, expect<EventWithDate>());

  const eventsLastWeekQuery = db
    .selectFrom("Events as e")
    .select(["e.id as id", "e.created_at as created_at"])
    .where("e.created_at", ">=", lastWeekStart)
    .where("e.created_at", "<", thisWeekStart)
    .compile();

  const { data: lastWeekEvents = [] } = useTypedQuery(eventsLastWeekQuery, expect<EventWithDate>());

  const targetsQuery = db
    .selectFrom("ScorecardTargets as st")
    .innerJoin("AccountManagers as am", "am.id", "st.account_manager_uuid")
    .select(["st.quotes_weekly as quotes_weekly"])
    .where("am.is_active", "=", 1)
    .compile();

  const { data: targets = [] } = useTypedQuery(targetsQuery, expect<ScorecardTarget>());

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
      current: thisWeekCumulative[currentDayOfWeek] || 0,
      goal: weeklyGoal,
      paceTarget: paceByDay[currentDayOfWeek] || 0,
    },
    lastWeek: {
      currentAtSameDay: lastWeekCumulative[currentDayOfWeek] || 0,
      totalAtEnd: lastWeekCumulative[7] || 0,
    },
    chartData,
  };
}
