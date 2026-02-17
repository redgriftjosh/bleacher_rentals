"use client";

import { MetricProgressBar } from "./MetricProgressBar";
import type { AccountManagerScorecard, TimeRange, ScorecardMetrics } from "../types";

type TotalsCardProps = {
  scorecards: AccountManagerScorecard[];
  timeRange: TimeRange;
};

function sumMetrics(scorecards: AccountManagerScorecard[], tr: TimeRange): ScorecardMetrics {
  return scorecards.reduce(
    (acc, sc) => {
      const m = sc[tr];
      return {
        quotes: acc.quotes + m.quotes,
        sales: acc.sales + m.sales,
        valueOfSalesCents: acc.valueOfSalesCents + m.valueOfSalesCents,
        valueOfRevenueCents: acc.valueOfRevenueCents + m.valueOfRevenueCents,
      };
    },
    { quotes: 0, sales: 0, valueOfSalesCents: 0, valueOfRevenueCents: 0 },
  );
}

function sumTargets(scorecards: AccountManagerScorecard[], tr: TimeRange) {
  return scorecards.reduce(
    (acc, sc) => {
      const t = sc.targets;
      switch (tr) {
        case "weekly":
          return {
            quotes: acc.quotes + t.quotesWeekly,
            sales: acc.sales + t.salesWeekly,
            valueOfSalesCents: acc.valueOfSalesCents + t.valueOfSalesWeeklyCents,
            valueOfRevenueCents: acc.valueOfRevenueCents + t.valueOfRevenueWeeklyCents,
          };
        case "quarterly":
          return {
            quotes: acc.quotes + t.quotesQuarterly,
            sales: acc.sales + t.salesQuarterly,
            valueOfSalesCents: acc.valueOfSalesCents + t.valueOfSalesQuarterlyCents,
            valueOfRevenueCents: acc.valueOfRevenueCents + t.valueOfRevenueQuarterlyCents,
          };
        case "annually":
          return {
            quotes: acc.quotes + t.quotesAnnually,
            sales: acc.sales + t.salesAnnually,
            valueOfSalesCents: acc.valueOfSalesCents + t.valueOfSalesAnnuallyCents,
            valueOfRevenueCents: acc.valueOfRevenueCents + t.valueOfRevenueAnnuallyCents,
          };
      }
    },
    { quotes: 0, sales: 0, valueOfSalesCents: 0, valueOfRevenueCents: 0 },
  );
}

export function TotalsCard({ scorecards, timeRange }: TotalsCardProps) {
  const totals = sumMetrics(scorecards, timeRange);
  const targets = sumTargets(scorecards, timeRange);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 shadow-sm">
      <h3 className="font-bold text-lg text-blue-900 mb-4">Team Totals</h3>
      <div className="space-y-3">
        <MetricProgressBar label="Quotes" current={totals.quotes} target={targets.quotes} />
        <MetricProgressBar label="Sales" current={totals.sales} target={targets.sales} />
        <MetricProgressBar
          label="Value of Sales"
          current={totals.valueOfSalesCents}
          target={targets.valueOfSalesCents}
          isMoney
        />
        <MetricProgressBar
          label="Value of Revenue"
          current={totals.valueOfRevenueCents}
          target={targets.valueOfRevenueCents}
          isMoney
        />
      </div>
    </div>
  );
}
