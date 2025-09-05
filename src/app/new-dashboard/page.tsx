"use client";
import LoadingSpinner from "@/components/LoadingSpinner";
import DashboardApp from "@/features/dashboard/DashboardApp";
import { FetchDashboardBleachers } from "@/features/dashboard/db/client/bleachers";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export default function Page() {
  const { getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["FetchDashboardBleachers"],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return FetchDashboardBleachers(token);
    },
  });

  if (error) {
    return <div>Uh Oh, Something went wrong... 😬</div>;
  }

  if (isLoading) {
    return (
      <div>
        <LoadingSpinner />
      </div>
    );
  }
  if (!data?.bleachers || data.bleachers.length === 0) {
    return <div>No Bleachers!</div>;
  }

  return <DashboardApp bleachers={data.bleachers} />;
}
