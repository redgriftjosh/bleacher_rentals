import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import { TimeRange } from "./useEventsWithinTimeRange";

export type ScorecardTarget = {
  id: string;
  account_manager_uuid: string | null;
  quotes_weekly: number | null;
  quotes_quarterly: number | null;
  quotes_annually: number | null;
  sales_weekly: number | null;
  sales_quarterly: number | null;
  sales_annually: number | null;
  value_of_sales_weekly_cents: number | null;
  value_of_sales_quarterly_cents: number | null;
  value_of_sales_annually_cents: number | null;
  value_of_revenue_weekly_cents: number | null;
  value_of_revenue_quarterly_cents: number | null;
  value_of_revenue_annually_cents: number | null;
  gross_margin_percent_weekly: number | null;
  gross_margin_percent_quarterly: number | null;
  gross_margin_percent_annually: number | null;
};

export type TargetType =
  | "quotes"
  | "sales"
  | "value_of_sales"
  | "value_of_revenue"
  | "gross_margin_percent";

export function useTargets(
  timeRange: TimeRange,
  targetType: TargetType,
  accountManagerUuid?: string | null,
) {
  const targetQuery = useMemo(() => {
    let query = db
      .selectFrom("ScorecardTargets as st")
      .innerJoin("AccountManagers as am", "am.id", "st.account_manager_uuid")
      .innerJoin("Users as u", "u.id", "am.user_uuid")
      .leftJoin("UserStatuses as us", "us.id", "u.status_uuid")
      .select([
        "st.id as id",
        "st.account_manager_uuid as account_manager_uuid",
        "st.quotes_weekly as quotes_weekly",
        "st.quotes_quarterly as quotes_quarterly",
        "st.quotes_annually as quotes_annually",
        "st.sales_weekly as sales_weekly",
        "st.sales_quarterly as sales_quarterly",
        "st.sales_annually as sales_annually",
        "st.value_of_sales_weekly_cents as value_of_sales_weekly_cents",
        "st.value_of_sales_quarterly_cents as value_of_sales_quarterly_cents",
        "st.value_of_sales_annually_cents as value_of_sales_annually_cents",
        "st.value_of_revenue_weekly_cents as value_of_revenue_weekly_cents",
        "st.value_of_revenue_quarterly_cents as value_of_revenue_quarterly_cents",
        "st.value_of_revenue_annually_cents as value_of_revenue_annually_cents",
        "st.gross_margin_percent_weekly as gross_margin_percent_weekly",
        "st.gross_margin_percent_quarterly as gross_margin_percent_quarterly",
        "st.gross_margin_percent_annually as gross_margin_percent_annually",
      ]);

    if (accountManagerUuid) {
      query = query.where("st.account_manager_uuid", "=", accountManagerUuid);
    } else {
      query = query
        .where("am.is_active", "=", 1)
        .where((eb) => eb.or([eb("us.status", "=", "Active"), eb("us.status", "=", "active")]));
    }

    return query.compile();
  }, [accountManagerUuid]);

  const { data: targets = [] } = useTypedQuery(targetQuery, expect<ScorecardTarget>());

  const goal = useMemo(() => {
    const total = targets.reduce((sum, target) => {
      if (targetType === "gross_margin_percent") {
        if (timeRange === "weekly") return sum + (target.gross_margin_percent_weekly ?? 0);
        if (timeRange === "quarterly") return sum + (target.gross_margin_percent_quarterly ?? 0);
        return sum + (target.gross_margin_percent_annually ?? 0);
      }

      if (targetType === "quotes") {
        if (timeRange === "weekly") return sum + (target.quotes_weekly ?? 0);
        if (timeRange === "quarterly") return sum + (target.quotes_quarterly ?? 0);
        return sum + (target.quotes_annually ?? 0);
      }

      if (targetType === "sales") {
        if (timeRange === "weekly") return sum + (target.sales_weekly ?? 0);
        if (timeRange === "quarterly") return sum + (target.sales_quarterly ?? 0);
        return sum + (target.sales_annually ?? 0);
      }

      if (targetType === "value_of_sales") {
        if (timeRange === "weekly") return sum + (target.value_of_sales_weekly_cents ?? 0) / 100;
        if (timeRange === "quarterly")
          return sum + (target.value_of_sales_quarterly_cents ?? 0) / 100;
        return sum + (target.value_of_sales_annually_cents ?? 0) / 100;
      }

      if (timeRange === "weekly") return sum + (target.value_of_revenue_weekly_cents ?? 0) / 100;
      if (timeRange === "quarterly")
        return sum + (target.value_of_revenue_quarterly_cents ?? 0) / 100;
      return sum + (target.value_of_revenue_annually_cents ?? 0) / 100;
    }, 0);

    // Percentage targets should be averaged, not summed
    if (targetType === "gross_margin_percent" && targets.length > 0) {
      return Math.round(total / targets.length);
    }
    return total;
  }, [targets, timeRange, targetType]);

  return { targets, goal };
}
