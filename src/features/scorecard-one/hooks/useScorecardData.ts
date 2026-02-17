"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import {
  getCurrentWeekStart,
  getCurrentWeekEnd,
  getCurrentQuarterStart,
  getCurrentQuarterEnd,
  getCurrentYearStart,
  getCurrentYearEnd,
} from "../dateUtils";
import type {
  AccountManagerInfo,
  AccountManagerScorecard,
  ScorecardMetrics,
  ScorecardTargetsData,
} from "../types";
import { DEFAULT_TARGETS } from "../types";

// ---- Row types for PowerSync queries ----

type AccountManagerRow = {
  userUuid: string | null;
  firstName: string | null;
  lastName: string | null;
  clerkUserId: string | null;
  avatarUrl: string | null;
};

type TargetRow = {
  userUuid: string | null;
  quotesWeekly: number | null;
  quotesQuarterly: number | null;
  quotesAnnually: number | null;
  salesWeekly: number | null;
  salesQuarterly: number | null;
  salesAnnually: number | null;
  valueOfSalesWeeklyCents: number | null;
  valueOfSalesQuarterlyCents: number | null;
  valueOfSalesAnnuallyCents: number | null;
  valueOfRevenueWeeklyCents: number | null;
  valueOfRevenueQuarterlyCents: number | null;
  valueOfRevenueAnnuallyCents: number | null;
};

type EventRow = {
  id: string;
  createdAt: string | null;
  eventStart: string | null;
  eventStatus: string | null;
  contractRevenueCents: number | null;
  createdByUserUuid: string | null;
};

// ---- Compiled queries ----

const accountManagersQuery = db
  .selectFrom("AccountManagers as am")
  .innerJoin("Users as u", "u.id", "am.user_uuid")
  .select([
    "am.user_uuid as userUuid",
    "u.first_name as firstName",
    "u.last_name as lastName",
    "u.clerk_user_id as clerkUserId",
    "u.avatar_image_url as avatarUrl",
  ])
  .where("am.is_active", "=", 1)
  .compile();

const targetsQuery = db
  .selectFrom("ScorecardTargets as st")
  .select([
    "st.user_uuid as userUuid",
    "st.quotes_weekly as quotesWeekly",
    "st.quotes_quarterly as quotesQuarterly",
    "st.quotes_annually as quotesAnnually",
    "st.sales_weekly as salesWeekly",
    "st.sales_quarterly as salesQuarterly",
    "st.sales_annually as salesAnnually",
    "st.value_of_sales_weekly_cents as valueOfSalesWeeklyCents",
    "st.value_of_sales_quarterly_cents as valueOfSalesQuarterlyCents",
    "st.value_of_sales_annually_cents as valueOfSalesAnnuallyCents",
    "st.value_of_revenue_weekly_cents as valueOfRevenueWeeklyCents",
    "st.value_of_revenue_quarterly_cents as valueOfRevenueQuarterlyCents",
    "st.value_of_revenue_annually_cents as valueOfRevenueAnnuallyCents",
  ])
  .compile();

// All events for current year (superset of weekly/quarterly data)
const eventsQuery = db
  .selectFrom("Events as e")
  .select([
    "e.id as id",
    "e.created_at as createdAt",
    "e.event_start as eventStart",
    "e.event_status as eventStatus",
    "e.contract_revenue_cents as contractRevenueCents",
    "e.created_by_user_uuid as createdByUserUuid",
  ])
  .compile();

// ---- Helper functions ----

function isInRange(dateStr: string | null, start: string, end: string): boolean {
  if (!dateStr) return false;
  // Extract just the date portion (YYYY-MM-DD) from potential ISO timestamps
  const dateOnly = dateStr.substring(0, 10);
  return dateOnly >= start && dateOnly <= end;
}

function computeMetrics(
  events: EventRow[],
  userUuid: string,
  createdAtStart: string,
  createdAtEnd: string,
  eventStartStart: string,
  eventStartEnd: string,
): ScorecardMetrics {
  let quotes = 0;
  let sales = 0;
  let valueOfSalesCents = 0;
  let valueOfRevenueCents = 0;

  for (const e of events) {
    if (e.createdByUserUuid !== userUuid) continue;

    // Number of quotes: events created in range (any status)
    const createdInRange = isInRange(e.createdAt, createdAtStart, createdAtEnd);
    if (createdInRange) {
      quotes++;
    }

    // Number of sales: booked events created in range
    if (createdInRange && e.eventStatus === "booked") {
      sales++;
      // Value of sales: revenue for booked events created in range
      valueOfSalesCents += e.contractRevenueCents ?? 0;
    }

    // Value of revenue: revenue for booked events where event_start is in range
    if (
      e.eventStatus === "booked" &&
      isInRange(e.eventStart, eventStartStart, eventStartEnd)
    ) {
      valueOfRevenueCents += e.contractRevenueCents ?? 0;
    }
  }

  return { quotes, sales, valueOfSalesCents, valueOfRevenueCents };
}

function targetRowToData(row: TargetRow | undefined): ScorecardTargetsData {
  if (!row) return DEFAULT_TARGETS;
  return {
    quotesWeekly: row.quotesWeekly ?? DEFAULT_TARGETS.quotesWeekly,
    quotesQuarterly: row.quotesQuarterly ?? DEFAULT_TARGETS.quotesQuarterly,
    quotesAnnually: row.quotesAnnually ?? DEFAULT_TARGETS.quotesAnnually,
    salesWeekly: row.salesWeekly ?? DEFAULT_TARGETS.salesWeekly,
    salesQuarterly: row.salesQuarterly ?? DEFAULT_TARGETS.salesQuarterly,
    salesAnnually: row.salesAnnually ?? DEFAULT_TARGETS.salesAnnually,
    valueOfSalesWeeklyCents:
      row.valueOfSalesWeeklyCents ?? DEFAULT_TARGETS.valueOfSalesWeeklyCents,
    valueOfSalesQuarterlyCents:
      row.valueOfSalesQuarterlyCents ?? DEFAULT_TARGETS.valueOfSalesQuarterlyCents,
    valueOfSalesAnnuallyCents:
      row.valueOfSalesAnnuallyCents ?? DEFAULT_TARGETS.valueOfSalesAnnuallyCents,
    valueOfRevenueWeeklyCents:
      row.valueOfRevenueWeeklyCents ?? DEFAULT_TARGETS.valueOfRevenueWeeklyCents,
    valueOfRevenueQuarterlyCents:
      row.valueOfRevenueQuarterlyCents ?? DEFAULT_TARGETS.valueOfRevenueQuarterlyCents,
    valueOfRevenueAnnuallyCents:
      row.valueOfRevenueAnnuallyCents ?? DEFAULT_TARGETS.valueOfRevenueAnnuallyCents,
  };
}

// ---- Main hook ----

export function useScorecardData(): {
  scorecards: AccountManagerScorecard[];
  isLoading: boolean;
} {
  const { data: amRows } = useTypedQuery(accountManagersQuery, expect<AccountManagerRow>());
  const { data: targetRows } = useTypedQuery(targetsQuery, expect<TargetRow>());
  const { data: eventRows } = useTypedQuery(eventsQuery, expect<EventRow>());

  const scorecards = useMemo(() => {
    if (!amRows?.length) return [];

    const weekStart = getCurrentWeekStart();
    const weekEnd = getCurrentWeekEnd();
    const quarterStart = getCurrentQuarterStart();
    const quarterEnd = getCurrentQuarterEnd();
    const yearStart = getCurrentYearStart();
    const yearEnd = getCurrentYearEnd();

    const targetsByUser = new Map<string, TargetRow>();
    for (const t of targetRows ?? []) {
      targetsByUser.set(t.userUuid, t);
    }

    const events = eventRows ?? [];

    return amRows.map((am): AccountManagerScorecard => {
      const manager: AccountManagerInfo = {
        userUuid: am.userUuid,
        firstName: am.firstName,
        lastName: am.lastName,
        clerkUserId: am.clerkUserId,
        avatarUrl: am.avatarUrl,
      };

      const targets = targetRowToData(targetsByUser.get(am.userUuid));

      const weekly = computeMetrics(events, am.userUuid, weekStart, weekEnd, weekStart, weekEnd);
      const quarterly = computeMetrics(
        events,
        am.userUuid,
        quarterStart,
        quarterEnd,
        quarterStart,
        quarterEnd,
      );
      const annually = computeMetrics(
        events,
        am.userUuid,
        yearStart,
        yearEnd,
        yearStart,
        yearEnd,
      );

      return { manager, targets, weekly, quarterly, annually };
    });
  }, [amRows, targetRows, eventRows]);

  return { scorecards, isLoading: !amRows };
}
