"use client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FetchDashboardBleachers } from "@/features/dashboard/db/client/bleachers";
import { FetchDashboardEvents } from "@/features/dashboard/db/client/events";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import DashboardApp from "@/features/dashboard/DashboardApp";
import CellEditor from "@/features/dashboard/components/CellEditor";
import { useEffect, useState } from "react";
import { useWorkTrackerSelectionStore } from "@/features/workTrackers/state/useWorkTrackerSelectionStore";
import { Tables } from "../../../database.types";
import { useDataRefreshTokenStore } from "@/state/dataRefreshTokenStore";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { fetchUserBleacherAssignmentsForSeason } from "@/features/dashboard/db/client/bleacherUsers";
import { useFilterDashboardStore } from "@/features/dashboardOptions/useFilterDashboardStore";
import WorkTrackerModal from "@/features/workTrackers/components/WorkTrackerModal";
import { DashboardOptions } from "@/features/dashboardOptions/DashboardOptions";
import { CreateEventButton } from "@/features/eventConfiguration/components/CreateEventButton";
import { EventConfiguration } from "@/features/eventConfiguration/components/EventConfiguration";

export default function Page() {
  const [selectedWorkTracker, setSelectedWorkTracker] = useState<Tables<"WorkTrackers"> | null>(
    null
  );
  const onlyShowMyEvents = useFilterDashboardStore((s) => s.onlyShowMyEvents);
  const refreshToken = useDataRefreshTokenStore((s) => s.token);
  const { isLoaded, userId, getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["FetchDashboardBleachersAndEvents", { onlyShowMyEvents, userId, refreshToken }],
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

  // Subscribe to selection store without changing DashboardApp props
  // Important: keep hooks above any early returns to preserve hook order across renders
  useEffect(() => {
    const unsub = useWorkTrackerSelectionStore.subscribe((s) => {
      const wt = s.selected;
      if (!wt) return;
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
    });
    return () => unsub();
  }, []);

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
    <div className="h-full grid grid-rows-[auto_1fr] gap-2 overflow-hidden min-w-0">
      <CellEditor onWorkTrackerOpen={handleWorkTrackerOpen} />
      <WorkTrackerModal
        selectedWorkTracker={selectedWorkTracker}
        setSelectedWorkTracker={setSelectedWorkTracker}
        setSelectedBlock={() => {}} // Not used in PixiJS version
      />
      <div className="min-w-0">
        <div className="flex justify-between items-center pt-2 pl-2 pr-2">
          <DashboardOptions />
          <CreateEventButton />
        </div>
        <EventConfiguration showSetupTeardown={false} />
      </div>
      <div className="min-h-0 min-w-0 overflow-hidden">
        <DashboardApp
          summerAssignedBleacherIds={data.summerAssignedBleacherIds}
          winterAssignedBleacherIds={data.winterAssignedBleacherIds}
        />
      </div>
    </div>
  );
}
