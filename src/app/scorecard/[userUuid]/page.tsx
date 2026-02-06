"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useScorecardData } from "@/features/scorecard/hooks/useScorecardData";
import { useIsAdmin } from "@/features/scorecard/hooks/useIsAdmin";
import { MetricProgressBar } from "@/features/scorecard/components/MetricProgressBar";
import { EditTargetsDialog } from "@/features/scorecard/components/EditTargetsDialog";
import { RevenueSpeedometer } from "@/features/scorecard/components/RevenueSpeedometer";
import { RevenueLineGraph } from "@/features/scorecard/components/RevenueLineGraph";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { TimeRange, AccountManagerScorecard } from "@/features/scorecard/types";
import { TIME_RANGE_LABELS, METRIC_LABELS } from "@/features/scorecard/types";
import { useHistoricalData } from "@/features/scorecard/hooks/useHistoricalData";

const TIME_RANGES: TimeRange[] = ["weekly", "quarterly", "annually"];

function getTargetsForRange(sc: AccountManagerScorecard, tr: TimeRange) {
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

function TimeRangeDetail({
  scorecard,
  timeRange,
}: {
  scorecard: AccountManagerScorecard;
  timeRange: TimeRange;
}) {
  const metrics = scorecard[timeRange];
  const targets = getTargetsForRange(scorecard, timeRange);
  const historicalData = useHistoricalData(scorecard.manager.userUuid, timeRange);

  // Speedometer shows value of revenue for this period
  const revenueTarget = targets.valueOfRevenueCents / 100;
  const revenueCurrent = metrics.valueOfRevenueCents / 100;

  return (
    <div className="space-y-6">
      {/* Progress bars */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">{TIME_RANGE_LABELS[timeRange]} Progress</h3>
        <div className="space-y-4">
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
      </div>

      {/* Speedometer + Line Graph side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueSpeedometer currentRevenue={revenueCurrent} maxRevenue={Math.max(revenueTarget, revenueCurrent * 1.1, 1)} />
        <RevenueLineGraph data={historicalData} />
      </div>
    </div>
  );
}

export default function AccountManagerDetailPage({
  params,
}: {
  params: Promise<{ userUuid: string }>;
}) {
  const { userUuid } = use(params);
  const { scorecards, isLoading } = useScorecardData();
  const isAdmin = useIsAdmin();
  const [activeRange, setActiveRange] = useState<TimeRange>("weekly");

  const scorecard = scorecards.find((sc) => sc.manager.userUuid === userUuid);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className="p-6">
        <Link href="/scorecard" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          Back to Scorecard
        </Link>
        <p className="text-gray-500">Account manager not found.</p>
      </div>
    );
  }

  const { manager } = scorecard;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/scorecard" className="text-blue-600 hover:underline text-sm">
            Back
          </Link>
          <Avatar className="w-12 h-12">
            <AvatarImage src={manager.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-lg">
              {manager.firstName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {manager.firstName} {manager.lastName}
            </h1>
            <p className="text-sm text-gray-500">Scorecard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin: edit targets button */}
          {isAdmin && (
            <EditTargetsDialog manager={manager} targets={scorecard.targets}>
              <button className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors">
                Edit Targets
              </button>
            </EditTargetsDialog>
          )}

          {/* Time range tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr}
                onClick={() => setActiveRange(tr)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeRange === tr
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {TIME_RANGE_LABELS[tr]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail view for active time range */}
      <TimeRangeDetail scorecard={scorecard} timeRange={activeRange} />
    </div>
  );
}
