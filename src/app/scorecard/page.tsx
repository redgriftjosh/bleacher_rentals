"use client";

import { useState } from "react";
import { useScorecardData } from "@/features/scorecard/hooks/useScorecardData";
import { AccountManagerCard } from "@/features/scorecard/components/AccountManagerCard";
import { TotalsCard } from "@/features/scorecard/components/TotalsCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { TimeRange } from "@/features/scorecard/types";
import { TIME_RANGE_LABELS } from "@/features/scorecard/types";

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

const TIME_RANGES: TimeRange[] = ["weekly", "quarterly", "annually"];

export default function ScorecardPage() {
  const { scorecards, isLoading } = useScorecardData();
  const [activeRange, setActiveRange] = useState<TimeRange>("weekly");

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Scorecard</h1>

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

      {/* Team totals */}
      <div className="mb-6">
        <TotalsCard scorecards={scorecards} timeRange={activeRange} />
      </div>

      {/* Per-account-manager cards */}
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

      {scorecards.length === 0 && (
        <p className="text-gray-500 text-center py-8">No active account managers found.</p>
      )}
    </div>
  );
}
