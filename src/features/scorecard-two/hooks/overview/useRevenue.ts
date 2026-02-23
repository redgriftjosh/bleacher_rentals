// "use client";
// import { db } from "@/components/providers/SystemProvider";
// import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
// import { lastWeekStartDate, thisWeekEndDate, thisWeekStartDate } from "../../constants/time";
// import { useMemo } from "react";
// import { getCurrentDayOfWeek } from "../../util/datetime";
// import { DateTime } from "luxon";

// type EventWithDate = {
//   id: string;
//   event_start: string | null;
//   contract_revenue_cents: number | null;
// };

// type ScorecardTarget = {
//   quotes_weekly: number | null;
// };

// function roundToTwo(value: number) {
//   return Math.round((value + Number.EPSILON) * 100) / 100;
// }

// function getEventStartWeekday(eventStart: string) {
//   const dateOnly = eventStart.slice(0, 10);
//   return DateTime.fromFormat(dateOnly, "yyyy-MM-dd").weekday;
// }

// export function useRevenue(createdByUserUuid?: string) {
//   const currentDayOfWeek = useMemo(() => getCurrentDayOfWeek(), []);
//   console.log("aldjf - thisWeekStartDate:", thisWeekStartDate);
//   console.log("aldjf - thisWeekEndDate:", thisWeekEndDate);
//   console.log("aldjf - lastWeekStartDate:", lastWeekStartDate);

//   let eventsThisWeekBuilder = db
//     .selectFrom("Events as e")
//     .select([
//       "e.id as id",
//       "e.event_start as event_start",
//       "e.contract_revenue_cents as contract_revenue_cents",
//     ])
//     .where("e.event_status", "=", "booked")
//     .where("e.event_start", "is not", null)
//     .where("e.event_start", ">=", thisWeekStartDate)
//     .where("e.event_start", "<", thisWeekEndDate);

//   if (createdByUserUuid) {
//     eventsThisWeekBuilder = eventsThisWeekBuilder.where(
//       "e.created_by_user_uuid",
//       "=",
//       createdByUserUuid,
//     );
//   }

//   const eventsThisWeekQuery = eventsThisWeekBuilder.compile();

//   const { data: thisWeekEvents = [] } = useTypedQuery(eventsThisWeekQuery, expect<EventWithDate>());
//   console.log("aldjf - thisWeekEvents:", thisWeekEvents);

//   let eventsLastWeekBuilder = db
//     .selectFrom("Events as e")
//     .select([
//       "e.id as id",
//       "e.event_start as event_start",
//       "e.contract_revenue_cents as contract_revenue_cents",
//     ])
//     .where("e.event_status", "=", "booked")
//     .where("e.event_start", "is not", null)
//     .where("e.event_start", ">=", lastWeekStartDate)
//     .where("e.event_start", "<", thisWeekStartDate);

//   if (createdByUserUuid) {
//     eventsLastWeekBuilder = eventsLastWeekBuilder.where(
//       "e.created_by_user_uuid",
//       "=",
//       createdByUserUuid,
//     );
//   }

//   const eventsLastWeekQuery = eventsLastWeekBuilder.compile();

//   const { data: lastWeekEvents = [] } = useTypedQuery(eventsLastWeekQuery, expect<EventWithDate>());

//   const targetsQuery = db
//     .selectFrom("ScorecardTargets as st")
//     .innerJoin("AccountManagers as am", "am.id", "st.account_manager_uuid")
//     .select(["st.quotes_weekly as quotes_weekly"])
//     .where("am.is_active", "=", 1)
//     .compile();

//   const { data: targets = [] } = useTypedQuery(targetsQuery, expect<ScorecardTarget>());

//   const weeklyGoal = useMemo(() => {
//     return targets.reduce((sum, target) => sum + (target.quotes_weekly ?? 0), 0);
//   }, [targets]);

//   const thisWeekByDay = useMemo(() => {
//     const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

//     thisWeekEvents.forEach((event) => {
//       if (!event.event_start) return;
//       const dayNum = getEventStartWeekday(event.event_start);
//       const valueToAdd = (event.contract_revenue_cents ?? 0) / 100;
//       byDay[dayNum] = roundToTwo(byDay[dayNum] + valueToAdd);
//     });

//     return byDay;
//   }, [thisWeekEvents]);

//   const lastWeekByDay = useMemo(() => {
//     const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

//     lastWeekEvents.forEach((event) => {
//       if (!event.event_start) return;
//       const dayNum = getEventStartWeekday(event.event_start);
//       const valueToAdd = (event.contract_revenue_cents ?? 0) / 100;
//       byDay[dayNum] = roundToTwo(byDay[dayNum] + valueToAdd);
//     });
//     return byDay;
//   }, [lastWeekEvents]);

//   const { thisWeekCumulative, lastWeekCumulative } = useMemo(() => {
//     const thisWeekCum: Record<number, number> = {};
//     const lastWeekCum: Record<number, number> = {};

//     let thisSum = 0;
//     let lastSum = 0;

//     for (let i = 1; i <= 7; i++) {
//       thisSum += thisWeekByDay[i];
//       lastSum += lastWeekByDay[i];
//       thisWeekCum[i] = roundToTwo(thisSum);
//       lastWeekCum[i] = roundToTwo(lastSum);
//     }

//     return { thisWeekCumulative: thisWeekCum, lastWeekCumulative: lastWeekCum };
//   }, [thisWeekByDay, lastWeekByDay]);

//   const paceByDay = useMemo(() => {
//     const dailyTarget = weeklyGoal / 5;
//     const pace: Record<number, number> = {};

//     for (let i = 1; i <= 7; i++) {
//       if (i <= 5) {
//         pace[i] = Math.round(dailyTarget * i);
//       } else {
//         pace[i] = weeklyGoal;
//       }
//     }

//     return pace;
//   }, [weeklyGoal]);

//   const chartData = useMemo(() => {
//     const dayLabels = [
//       "Monday",
//       "Tuesday",
//       "Wednesday",
//       "Thursday",
//       "Friday",
//       "Saturday",
//       "Sunday",
//     ];
//     const dayShort = ["M", "T", "W", "T", "F", "S", "S"];

//     return dayLabels.map((label, idx) => {
//       const dayNum = idx + 1;
//       return {
//         day: dayShort[idx],
//         dayLabel: label,
//         thisWeek: thisWeekCumulative[dayNum],
//         lastWeek: lastWeekCumulative[dayNum],
//         pace: paceByDay[dayNum],
//       };
//     });
//   }, [thisWeekCumulative, lastWeekCumulative, paceByDay]);

//   return {
//     thisWeek: {
//       current: thisWeekCumulative[7] || 0,
//       goal: weeklyGoal,
//       paceTarget: paceByDay[7] || 0,
//     },
//     lastWeek: {
//       currentAtSameDay: lastWeekCumulative[7] || 0,
//       totalAtEnd: lastWeekCumulative[7] || 0,
//     },
//     chartData,
//   };
// }
