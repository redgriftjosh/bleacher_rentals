"use client";
import { WeeksList } from "@/features/scorecard/components/WeeksList";
import { RevenueSpeedometer } from "@/features/scorecard/components/RevenueSpeedometer";
import { RevenueLineGraph } from "@/features/scorecard/components/RevenueLineGraph";
import { useQuery } from "@tanstack/react-query";
import { fetchYearToDateRevenue, fetchMonthlyRevenue } from "@/features/scorecard/db";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

export default function ScorecardPage() {
  const supabase = useClerkSupabaseClient();

  const { data: ytdRevenue = 0 } = useQuery({
    queryKey: ["ytd-revenue"],
    queryFn: async () => {
      return fetchYearToDateRevenue(supabase);
    },
  });

  const { data: monthlyRevenue = [] } = useQuery({
    queryKey: ["monthly-revenue"],
    queryFn: async () => {
      return fetchMonthlyRevenue(supabase);
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Scorecard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RevenueSpeedometer currentRevenue={ytdRevenue} maxRevenue={10000} />
        <RevenueLineGraph data={monthlyRevenue} />
      </div>

      <WeeksList />
    </div>
  );
}
