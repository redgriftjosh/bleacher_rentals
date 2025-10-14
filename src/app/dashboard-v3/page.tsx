"use client";
import LoadingSpinner from "@/components/LoadingSpinner";
import DashboardApp from "@/features/dashboard/DashboardApp";
import { FetchDashboardBleachers } from "@/features/dashboard/db/client/bleachers";
import { FetchDashboardEvents } from "@/features/dashboard/db/client/events";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { EventConfiguration } from "../(dashboards)/bleachers-dashboard/_lib/_components/event-configuration/EventConfiguration";
import { CreateEventButton } from "../(dashboards)/bleachers-dashboard/_lib/_components/event-configuration/CreateEventButton";
import FilterDashboard from "../(dashboards)/bleachers-dashboard/_lib/_components/FilterDashboard";
import DashboardAppV3 from "@/features/dashboardV3/DashboardAppV3";
import WorkTrackerModal from "../(dashboards)/bleachers-dashboard/_lib/_components/dashboard/WorkTrackerModal";
import CellEditor from "@/features/dashboard/components/CellEditor";
import { useState } from "react";
import { Tables } from "../../../database.types";
import { useFilterDashboardStore } from "../(dashboards)/bleachers-dashboard/_lib/useFilterDashboardStore";
import { DashboardOptions } from "../(dashboards)/bleachers-dashboard/_lib/_components/DashboardOptions";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { fetchUserBleacherAssignmentsForSeason } from "@/features/dashboard/db/client/bleacherUsers";

export default function Page() {
  const [selectedWorkTracker, setSelectedWorkTracker] = useState<Tables<"WorkTrackers"> | null>(
    null
  );
  const onlyShowMyEvents = useFilterDashboardStore((s) => s.onlyShowMyEvents);
  const { isLoaded, userId, getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["FetchDashboardBleachersAndEvents", { onlyShowMyEvents, userId }],
    enabled: isLoaded && !!userId,
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      const [b, e] = await Promise.all([
        FetchDashboardBleachers(token),
        FetchDashboardEvents(token, { onlyMine: onlyShowMyEvents, clerkUserId: userId }),
      ]);

      // Fetch BleacherUsers assignments for the logged-in user
      const supabase = await getSupabaseClient(token!);
      const { summerAssignedBleacherIds, winterAssignedBleacherIds } =
        await fetchUserBleacherAssignmentsForSeason(supabase, userId!);

      return {
        bleachers: b.bleachers,
        events: e.events,
        summerAssignedBleacherIds,
        winterAssignedBleacherIds,
      };
    },
  });

  const handleWorkTrackerOpen = (workTracker: Tables<"WorkTrackers">) => {
    setSelectedWorkTracker(workTracker);
  };

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

  const handleWorkTrackerSelectFromPixi = (wt: {
    work_tracker_id: number;
    bleacher_id: number;
    date: string;
  }) => {
    setSelectedWorkTracker({
      work_tracker_id: wt.work_tracker_id,
      bleacher_id: wt.bleacher_id,
      date: wt.date,
      created_at: "",
      dropoff_address_id: null,
      dropoff_poc: null,
      dropoff_time: null,
      notes: null,
      pay_cents: null,
      pickup_address_id: null,
      pickup_poc: null,
      pickup_time: null,
      user_id: null,
    } as Tables<"WorkTrackers">);
  };

  return (
    <div className="h-full grid grid-rows-[auto_1fr] gap-2 overflow-hidden">
      <CellEditor onWorkTrackerOpen={handleWorkTrackerOpen} />
      <WorkTrackerModal
        selectedWorkTracker={selectedWorkTracker}
        setSelectedWorkTracker={setSelectedWorkTracker}
        setSelectedBlock={() => {}} // Not used in PixiJS version
      />
      <div>
        <div className="flex justify-between items-center pt-2 pl-2 pr-2">
          <DashboardOptions />
          <CreateEventButton />
        </div>
        <EventConfiguration showSetupTeardown={false} />
      </div>
      <div className="min-h-0">
        <DashboardAppV3
          bleachers={data.bleachers}
          events={data.events}
          summerAssignedBleacherIds={data.summerAssignedBleacherIds}
          winterAssignedBleacherIds={data.winterAssignedBleacherIds}
          onWorkTrackerSelect={handleWorkTrackerSelectFromPixi}
        />
      </div>
    </div>
  );
}
