"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useScorecardData } from "@/features/scorecard/hooks/useScorecardData";
import { useScorecardInsights } from "@/features/scorecard/hooks/useScorecardInsights";
import { AccountManagerCard } from "@/features/scorecard/components/AccountManagerCard";
import { TotalsCard } from "@/features/scorecard/components/TotalsCard";
import { PaceForecastCard } from "@/features/scorecard/components/PaceForecastCard";
import { LeaderboardPanel } from "@/features/scorecard/components/LeaderboardPanel";
import { ReportsPanel } from "@/features/scorecard/components/ReportsPanel";
import { UtilizationPanel } from "@/features/scorecard/components/UtilizationPanel";
import { CompactDetailedStatWithGraph } from "@/features/scorecard/components/CompactDetailedStatWithGraph";
import { ScorecardHeaderNav } from "@/features/scorecard/components/ScorecardHeaderNav";
import LoadingSpinner from "@/components/LoadingSpinner";

// ---- Old scorecard components (preserved, commented out) ----
// import { WeeksList } from "@/features/scorecard/components/WeeksList";
// import { RevenueSpeedometer } from "@/features/scorecard/components/RevenueSpeedometer";
// import { RevenueLineGraph } from "@/features/scorecard/components/RevenueLineGraph";
// import { useQuery } from "@tanstack/react-query";
// import { fetchYearToDateRevenue, fetchMonthlyRevenue } from "@/features/scorecard/db";
// import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
//
// function OldScorecardPage() {
//   const supabase = useClerkSupabaseClient();
//   const { data: ytdRevenue = 0 } = useQuery({
//     queryKey: ["ytd-revenue"],
//     queryFn: async () => fetchYearToDateRevenue(supabase),
//   });
//   const { data: monthlyRevenue = [] } = useQuery({
//     queryKey: ["monthly-revenue"],
//     queryFn: async () => fetchMonthlyRevenue(supabase),
//   });
//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-6">Scorecard</h1>
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//         <RevenueSpeedometer currentRevenue={ytdRevenue} maxRevenue={10000} />
//         <RevenueLineGraph data={monthlyRevenue} />
//       </div>
//       <WeeksList />
//     </div>
//   );
// }

const SCORECARD_VIEWS = ["overview", "leaderboard", "reports", "utilization"] as const;
type ScorecardView = (typeof SCORECARD_VIEWS)[number];

export default function ScorecardPage() {
  const { scorecards, isLoading } = useScorecardData();
  const {
    reportRows,
    utilization,
    isLoading: isInsightsLoading,
  } = useScorecardInsights(scorecards);
  const [activeView, setActiveView] = useState<ScorecardView>("overview");
  const searchParams = useSearchParams();
  const activeRange = useMemo(() => {
    const value = searchParams.get("timeRange");
    if (value === "weekly" || value === "quarterly" || value === "annually") {
      return value;
    }
    return "weekly";
  }, [searchParams]);

  if (isLoading || isInsightsLoading) {
    return (
      <div className="p-6 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const managerOptions = useMemo(
    () =>
      scorecards.map((sc) => ({
        id: sc.manager.userUuid,
        name: `${sc.manager.firstName} ${sc.manager.lastName}`.trim(),
      })),
    [scorecards],
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <ScorecardHeaderNav managers={managerOptions} />
      </div>

      {/* <div className="flex bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {SCORECARD_VIEWS.map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
              activeView === view
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {view}
          </button>
        ))}
      </div> */}

      {activeView === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            <CompactDetailedStatWithGraph />
            <CompactDetailedStatWithGraph />
            <CompactDetailedStatWithGraph />
            {/* <CompactDetailedStatWithGraph /> */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 mb-6">
            <CompactDetailedStatWithGraph />
            <CompactDetailedStatWithGraph />
            {/* <CompactDetailedStatWithGraph /> */}
          </div>
          <CompactDetailedStatWithGraph />
          {/* <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <TotalsCard scorecards={scorecards} timeRange={activeRange} />
            <PaceForecastCard scorecards={scorecards} timeRange={activeRange} />
          </div> */}

          {/* <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Conversion Snapshot</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Quotes</p>
                <p className="text-lg font-semibold text-gray-900">{conversion.quotes}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sales</p>
                <p className="text-lg font-semibold text-gray-900">{conversion.sales}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Win Rate</p>
                <p className="text-lg font-semibold text-gray-900">
                  {conversion.winRateCount.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Sale Value</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMoney(Math.round(conversion.avgSaleValue))}
                </p>
              </div>
            </div>
          </div> */}

          <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Managers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {scorecards.map((sc) => (
              <AccountManagerCard
                key={sc.manager.userUuid}
                scorecard={sc}
                timeRange={activeRange}
              />
            ))}
          </div>
        </>
      )}

      {activeView === "leaderboard" && <LeaderboardPanel scorecards={scorecards} />}

      {activeView === "reports" && <ReportsPanel rows={reportRows} />}

      {activeView === "utilization" && (
        <UtilizationPanel
          currentWeek={utilization.currentWeek}
          recentWeeks={utilization.recentWeeks}
          bleacherCount={utilization.bleacherCount}
        />
      )}

      {scorecards.length === 0 && (
        <p className="text-gray-500 text-center py-8">No active account managers found.</p>
      )}
    </div>
  );
}
