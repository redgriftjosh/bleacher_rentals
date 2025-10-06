"use client";
import LoadingSpinner from "@/components/LoadingSpinner";
import DashboardApp from "@/features/dashboard/DashboardApp";
import { FetchDashboardBleachers } from "@/features/dashboard/db/client/bleachers";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { EventConfiguration } from "../(dashboards)/bleachers-dashboard/_lib/_components/event-configuration/EventConfiguration";
import { CreateEventButton } from "../(dashboards)/bleachers-dashboard/_lib/_components/event-configuration/CreateEventButton";
import FilterDashboard from "../(dashboards)/bleachers-dashboard/_lib/_components/FilterDashboard";
import DashboardAppV3 from "@/features/dashboardV3/DashboardAppV3";

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

  return (
    <div className="h-full grid grid-rows-[auto_1fr] gap-2 overflow-hidden">
      <div>
        <div className="flex justify-between items-center pt-2 pl-2 pr-2">
          <FilterDashboard />
          <CreateEventButton />
        </div>
        <EventConfiguration />
      </div>
      <div className="min-h-0">
        <DashboardAppV3 bleachers={data.bleachers} />
      </div>
    </div>
  );
}
