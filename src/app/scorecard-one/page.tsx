"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useScorecardData } from "@/features/scorecard-one/hooks/useScorecardData";
import { useScorecardInsights } from "@/features/scorecard-one/hooks/useScorecardInsights";
import { AccountManagerCard } from "@/features/scorecard-one/components/AccountManagerCard";
import { TotalsCard } from "@/features/scorecard-one/components/TotalsCard";
import { PaceForecastCard } from "@/features/scorecard-one/components/PaceForecastCard";
import { LeaderboardPanel } from "@/features/scorecard-one/components/LeaderboardPanel";
import { ReportsPanel } from "@/features/scorecard-one/components/ReportsPanel";
import { UtilizationPanel } from "@/features/scorecard-one/components/UtilizationPanel";
import { CompactDetailedStatWithGraph } from "@/features/scorecard-one/components/CompactDetailedStatWithGraph";
import { ScorecardHeaderNav } from "@/features/scorecard-one/components/ScorecardHeaderNav";
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

      {activeView === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            <CompactDetailedStatWithGraph statType="number-of-quotes-sent" />
            <CompactDetailedStatWithGraph statType="number-of-quotes-signed" />
            <CompactDetailedStatWithGraph statType="value-of-quotes-signed" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 mb-6">
            <CompactDetailedStatWithGraph statType="revenue" />
            <CompactDetailedStatWithGraph statType="bleacher-utilization" />
          </div>

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
