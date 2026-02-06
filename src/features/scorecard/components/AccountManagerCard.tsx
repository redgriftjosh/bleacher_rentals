"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MetricProgressBar } from "./MetricProgressBar";
import type { AccountManagerScorecard, TimeRange } from "../types";

type AccountManagerCardProps = {
  scorecard: AccountManagerScorecard;
  timeRange: TimeRange;
};

function getMetrics(sc: AccountManagerScorecard, tr: TimeRange) {
  return sc[tr];
}

function getTargets(sc: AccountManagerScorecard, tr: TimeRange) {
  const t = sc.targets;
  switch (tr) {
    case "weekly":
      return {
        quotes: t.quotesWeekly,
        sales: t.salesWeekly,
        valueOfSalesCents: t.valueOfSalesWeeklyCents,
        valueOfRevenueCents: t.valueOfRevenueWeeklyCents,
      };
    case "quarterly":
      return {
        quotes: t.quotesQuarterly,
        sales: t.salesQuarterly,
        valueOfSalesCents: t.valueOfSalesQuarterlyCents,
        valueOfRevenueCents: t.valueOfRevenueQuarterlyCents,
      };
    case "annually":
      return {
        quotes: t.quotesAnnually,
        sales: t.salesAnnually,
        valueOfSalesCents: t.valueOfSalesAnnuallyCents,
        valueOfRevenueCents: t.valueOfRevenueAnnuallyCents,
      };
  }
}

export function AccountManagerCard({ scorecard, timeRange }: AccountManagerCardProps) {
  const metrics = getMetrics(scorecard, timeRange);
  const targets = getTargets(scorecard, timeRange);
  const { manager } = scorecard;

  return (
    <Link
      href={`/scorecard/${manager.userUuid}`}
      className="block bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={manager.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
            {manager.firstName?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold text-gray-900">
            {manager.firstName} {manager.lastName}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <MetricProgressBar label="Quotes" current={metrics.quotes} target={targets.quotes} />
        <MetricProgressBar label="Sales" current={metrics.sales} target={targets.sales} />
        <MetricProgressBar
          label="Value of Sales"
          current={metrics.valueOfSalesCents}
          target={targets.valueOfSalesCents}
          isMoney
        />
        <MetricProgressBar
          label="Value of Revenue"
          current={metrics.valueOfRevenueCents}
          target={targets.valueOfRevenueCents}
          isMoney
        />
      </div>
    </Link>
  );
}
