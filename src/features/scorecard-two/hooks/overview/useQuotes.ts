"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import {
  lastQuarterStartTimeStampTZ,
  lastWeekStartTimeStampTZ,
  thisQuarterEndTimeStampTZ,
  thisQuarterStartTimeStampTZ,
  thisWeekEndTimeStampTZ,
  thisWeekStartTimeStampTZ,
} from "../../constants/time";
import { useMemo } from "react";
import {
  getCurrentDayOfWeek,
  getDateKeys,
  isWeekdayKey,
  toLocalDateKey,
} from "../../util/datetime";
import { useSearchParams } from "next/navigation";

type EventWithDate = {
  id: string;
  created_at: string | null;
  contract_revenue_cents: number | null;
};

type ScorecardTarget = {
  quotes_weekly: number | null;
  quotes_quarterly: number | null;
};

type DateType = "created_at" | "event_start";

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function useQuotes(onlyBooked?: boolean, useValue?: boolean, createdByUserUuid?: string) {
  const currentDayOfWeek = useMemo(() => getCurrentDayOfWeek(), []);
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("timeRange") ?? "weekly";

  let eventsThisPeriodBuilder = db
    .selectFrom("Events as e")
    .select([
      "e.id as id",
      "e.created_at as created_at",
      "e.contract_revenue_cents as contract_revenue_cents",
    ]);

  if (activeRange === "weekly") {
    eventsThisPeriodBuilder = eventsThisPeriodBuilder
      .where("e.created_at", ">=", thisWeekStartTimeStampTZ)
      .where("e.created_at", "<", thisWeekEndTimeStampTZ);
  } else if (activeRange === "quarterly") {
    eventsThisPeriodBuilder = eventsThisPeriodBuilder
      .where("e.created_at", ">=", thisQuarterStartTimeStampTZ)
      .where("e.created_at", "<", thisQuarterEndTimeStampTZ);
  } else if (activeRange === "annually") {
  }

  if (onlyBooked) {
    eventsThisPeriodBuilder = eventsThisPeriodBuilder.where("e.event_status", "=", "booked");
  }

  if (createdByUserUuid) {
    eventsThisPeriodBuilder = eventsThisPeriodBuilder.where(
      "e.created_by_user_uuid",
      "=",
      createdByUserUuid,
    );
  }

  const eventsThisPeriodQuery = eventsThisPeriodBuilder.compile();

  const { data: thisPeriodEvents = [] } = useTypedQuery(
    eventsThisPeriodQuery,
    expect<EventWithDate>(),
  );
  useMemo(() => {
    console.log("useQuotes - thisPeriodEvents:", thisPeriodEvents);
  }, [thisPeriodEvents]);

  let eventsLastPeriodBuilder = db
    .selectFrom("Events as e")
    .select([
      "e.id as id",
      "e.created_at as created_at",
      "e.contract_revenue_cents as contract_revenue_cents",
    ]);

  if (activeRange === "weekly") {
    eventsLastPeriodBuilder = eventsLastPeriodBuilder
      .where("e.created_at", ">=", lastWeekStartTimeStampTZ)
      .where("e.created_at", "<", thisWeekStartTimeStampTZ);
  } else if (activeRange === "quarterly") {
    eventsLastPeriodBuilder = eventsLastPeriodBuilder
      .where("e.created_at", ">=", lastQuarterStartTimeStampTZ)
      .where("e.created_at", "<", thisQuarterStartTimeStampTZ);
  } else if (activeRange === "annually") {
  }

  if (onlyBooked) {
    eventsLastPeriodBuilder = eventsLastPeriodBuilder.where("e.event_status", "=", "booked");
  }

  if (createdByUserUuid) {
    eventsLastPeriodBuilder = eventsLastPeriodBuilder.where(
      "e.created_by_user_uuid",
      "=",
      createdByUserUuid,
    );
  }

  const eventsLastPeriodQuery = eventsLastPeriodBuilder.compile();

  const { data: lastPeriodEvents = [] } = useTypedQuery(
    eventsLastPeriodQuery,
    expect<EventWithDate>(),
  );

  const targetsQuery = db
    .selectFrom("ScorecardTargets as st")
    .innerJoin("AccountManagers as am", "am.id", "st.account_manager_uuid")
    .select(["st.quotes_weekly as quotes_weekly", "st.quotes_quarterly as quotes_quarterly"])
    .where("am.is_active", "=", 1)
    .compile();

  const { data: targets = [] } = useTypedQuery(targetsQuery, expect<ScorecardTarget>());

  const goal = useMemo(() => {
    if (activeRange === "weekly") {
      return targets.reduce((sum, target) => sum + (target.quotes_weekly ?? 0), 0);
    } else if (activeRange === "quarterly") {
      return targets.reduce((sum, target) => sum + (target.quotes_quarterly ?? 0), 0);
    } else if (activeRange === "annually") {
      // return targets.reduce((sum, target) => sum + (target.quotes_annual ?? 0), 0);
    }
    return targets.reduce((sum, target) => sum + (target.quotes_weekly ?? 0), 0);
  }, [targets]);

  const thisPeriodByDay = useMemo(() => {
    if (activeRange === "quarterly") {
      const dateKeys = getDateKeys(thisQuarterStartTimeStampTZ, thisQuarterEndTimeStampTZ);
      const keyToIndex = new Map(dateKeys.map((k, i) => [k, i + 1]));
      const byIndex: Record<number, number> = {};
      for (let i = 1; i <= dateKeys.length; i++) byIndex[i] = 0;

      thisPeriodEvents.forEach((event) => {
        if (!event.created_at) return;
        const key = toLocalDateKey(event.created_at);
        const idx = keyToIndex.get(key);
        if (!idx) return;
        const valueToAdd = useValue ? (event.contract_revenue_cents ?? 0) / 100 : 1;
        byIndex[idx] = roundToTwo(byIndex[idx] + valueToAdd);
      });

      return byIndex;
    } else {
      const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

      thisPeriodEvents.forEach((event) => {
        if (!event.created_at) return;
        const date = new Date(event.created_at);
        const day = date.getDay();
        const dayNum = day === 0 ? 7 : day;
        const valueToAdd = useValue ? (event.contract_revenue_cents ?? 0) / 100 : 1;
        byDay[dayNum] = roundToTwo(byDay[dayNum] + valueToAdd);
      });

      return byDay;
    }
  }, [thisPeriodEvents, useValue]);

  const lastPeriodByDay = useMemo(() => {
    if (activeRange === "quarterly") {
      const dateKeys = getDateKeys(lastQuarterStartTimeStampTZ, thisQuarterStartTimeStampTZ);
      const keyToIndex = new Map(dateKeys.map((k, i) => [k, i + 1]));
      const byIndex: Record<number, number> = {};
      for (let i = 1; i <= dateKeys.length; i++) byIndex[i] = 0;

      lastPeriodEvents.forEach((event) => {
        if (!event.created_at) return;
        const key = toLocalDateKey(event.created_at);
        const idx = keyToIndex.get(key);
        if (!idx) return;
        const valueToAdd = useValue ? (event.contract_revenue_cents ?? 0) / 100 : 1;
        byIndex[idx] = roundToTwo(byIndex[idx] + valueToAdd);
      });

      return byIndex;
    } else {
      const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

      lastPeriodEvents.forEach((event) => {
        if (!event.created_at) return;
        const date = new Date(event.created_at);
        const day = date.getDay();
        const dayNum = day === 0 ? 7 : day;
        const valueToAdd = useValue ? (event.contract_revenue_cents ?? 0) / 100 : 1;
        byDay[dayNum] = roundToTwo(byDay[dayNum] + valueToAdd);
      });
      return byDay;
    }
  }, [lastPeriodEvents, useValue]);

  const { thisPeriodCumulative, lastPeriodCumulative } = useMemo(() => {
    const thisPeriodCum: Record<number, number> = {};
    const lastPeriodCum: Record<number, number> = {};

    let thisSum = 0;
    let lastSum = 0;

    for (let i = 1; i <= 7; i++) {
      thisSum += thisPeriodByDay[i];
      lastSum += lastPeriodByDay[i];
      thisPeriodCum[i] = roundToTwo(thisSum);
      lastPeriodCum[i] = roundToTwo(lastSum);
    }

    return { thisPeriodCumulative: thisPeriodCum, lastPeriodCumulative: lastPeriodCum };
  }, [thisPeriodByDay, lastPeriodByDay]);

  const paceByDay = useMemo(() => {
    const pace: Record<number, number> = {};

    if (activeRange === "quarterly") {
      const dateKeys = getDateKeys(thisQuarterStartTimeStampTZ, thisQuarterEndTimeStampTZ);
      const totalQuarterWeekdays = dateKeys.filter(isWeekdayKey).length;
      const dailyTarget = totalQuarterWeekdays > 0 ? goal / totalQuarterWeekdays : 0;
      let running = 0;

      for (let i = 1; i <= dateKeys.length; i++) {
        const key = dateKeys[i - 1];
        if (isWeekdayKey(key)) {
          running += dailyTarget;
        }
        pace[i] = roundToTwo(running); // weekend stays flat
      }

      return pace;
    }
    // else weekly by default
    const dailyTarget = goal / 5;

    for (let i = 1; i <= 7; i++) {
      if (i <= 5) {
        pace[i] = Math.round(dailyTarget * i);
      } else {
        pace[i] = goal;
      }
    }

    return pace;
  }, [goal]);

  const currentIndex = useMemo(() => {
    if (activeRange !== "quarterly") return currentDayOfWeek;
    const dateKeys = getDateKeys(thisQuarterStartTimeStampTZ, thisQuarterEndTimeStampTZ);

    const todayKey = toLocalDateKey(new Date().toISOString());
    const idx = dateKeys.indexOf(todayKey);

    if (idx >= 0) return idx + 1;
    if (todayKey < dateKeys[0]) return 0;
    return dateKeys.length;
  }, [activeRange, currentDayOfWeek]);

  const chartData = useMemo(() => {
    if (activeRange === "quarterly") {
      const dateKeys = getDateKeys(thisQuarterStartTimeStampTZ, thisQuarterEndTimeStampTZ);
      return dateKeys.map((dateKey, idx) => {
        const point = idx + 1;
        const d = new Date(`${dateKey}T00:00:00`);
        return {
          day: `${d.getMonth() + 1}/${d.getDate()}`,
          dayLabel: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }), // "January 12"
          thisPeriod: point <= currentIndex ? thisPeriodCumulative[point] : null,
          lastPeriod: lastPeriodCumulative[point] ?? 0,
          pace: paceByDay[point] ?? 0,
        };
      });
    } else {
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
          thisPeriod: dayNum <= currentDayOfWeek ? thisPeriodCumulative[dayNum] : null,
          lastPeriod: lastPeriodCumulative[dayNum],
          pace: paceByDay[dayNum],
        };
      });
    }
  }, [currentDayOfWeek, thisPeriodCumulative, lastPeriodCumulative, paceByDay]);

  return {
    thisPeriod: {
      current: thisPeriodCumulative[currentDayOfWeek] || 0,
      goal: goal,
      paceTarget: paceByDay[currentDayOfWeek] || 0,
    },
    lastPeriod: {
      currentAtSameDay: lastPeriodCumulative[currentDayOfWeek] || 0,
      totalAtEnd: lastPeriodCumulative[7] || 0,
    },
    chartData,
  };
}
