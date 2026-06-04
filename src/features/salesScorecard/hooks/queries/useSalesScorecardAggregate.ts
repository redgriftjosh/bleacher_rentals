"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

type AggregateRow = {
  id: string;
  account_manager_uuid: string | null;
  year: number | null;
  quotes_sent_count: number | null;
  sales_count: number | null;
  value_of_sales_cents: number | null;
  revenue_cents: number | null;
  cogs_cents: number | null;
};

export function useSalesScorecardAggregate(year: number) {
  const query = useMemo(
    () =>
      db
        .selectFrom("SalesScorecardStatsPerAccountManager as s")
        .select([
          "s.id as id",
          "s.account_manager_uuid as account_manager_uuid",
          "s.year as year",
          "s.quotes_sent_count as quotes_sent_count",
          "s.sales_count as sales_count",
          "s.value_of_sales_cents as value_of_sales_cents",
          "s.revenue_cents as revenue_cents",
          "s.cogs_cents as cogs_cents",
        ])
        .where("s.year", "=", year)
        .compile(),
    [year],
  );

  const { data = [] } = useTypedQuery(query, expect<AggregateRow>());
  return data;
}

export type SalesAggregateRow = AggregateRow;
