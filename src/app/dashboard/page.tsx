"use client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@clerk/nextjs";
import DashboardApp from "@/features/dashboard/DashboardApp";
import CellEditor from "@/features/dashboard/components/CellEditor";
import { useEffect, useState } from "react";
import { useWorkTrackerSelectionStore } from "@/features/workTrackers/state/useWorkTrackerSelectionStore";
import { Tables } from "../../../database.types";
import { useDashboardFilterSettings } from "@/features/dashboardOptions/useDashboardFilterSettings";
import WorkTrackerModal from "@/features/workTrackers/components/WorkTrackerModal";
import { DashboardOptions } from "@/features/dashboardOptions/DashboardOptions";
import { SeasonToggle } from "@/features/dashboardOptions/SeasonToggle";
import { CreateEventButton } from "@/features/eventConfiguration/components/CreateEventButton";
import { EventConfiguration } from "@/features/eventConfiguration/components/EventConfiguration";
import { MaintenanceEventPanel } from "@/features/maintenanceEvents/components/MaintenanceEventPanel";
import BleacherLocationModal from "@/features/dashboard/components/BleacherLocationModal";
import SwapConfirmationModal from "@/features/dashboard/components/SwapConfirmationModal";
import WorkTrackerDragConfirmModal from "@/features/workTrackers/components/WorkTrackerDragConfirmModal";
import { useBleacherLocationModalStore } from "@/features/dashboard/state/useBleacherLocationModalStore";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { supabaseClientRegistry } from "@/features/dashboard/util/supabaseClientRegistry";
import { AddressTooltip } from "@/features/dashboard/components/AddressTooltip";
import { useDriverUnavailability } from "@/features/dashboard/db/hooks/useDriverUnavailability";
import { useDriverUnavailabilityStore } from "@/features/dashboard/state/useDriverUnavailabilityStore";
import { useDashboardPowerSync } from "@/features/dashboard/db/hooks/powersync/useDashboardPowerSync";
import { ZoneSelector } from "@/features/dashboardOptions/ZoneSelector";
import { SubrentalSuggestions } from "@/features/dashboardOptions/SubrentalSuggestions";
import { SubrentalEventPanel } from "@/features/subrentals/components/SubrentalEventPanel";

export default function Page() {
  const [selectedWorkTracker, setSelectedWorkTracker] = useState<Tables<"WorkTrackers"> | null>(
    null,
  );
  const { state: dashboardFilters, userContext } = useDashboardFilterSettings();
  const onlyShowMyEvents = dashboardFilters?.onlyShowMyEvents ?? true;
  const { isLoaded, userId } = useAuth();
  const supabase = useClerkSupabaseClient();

  // Register supabase client for PixiJS components
  useEffect(() => {
    supabaseClientRegistry.setClient(supabase);
    return () => {
      supabaseClientRegistry.setClient(null);
    };
  }, [supabase]);

  // Bleacher location modal state
  const locationModal = useBleacherLocationModalStore();

  // Reactive PowerSync queries — replaces tanstack useQuery + Supabase REST
  const { bleachers } = useDashboardPowerSync({
    onlyShowMyEvents,
    clerkUserId: userId,
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
        id: wt.id,
        bleacher_uuid: wt.bleacher_uuid,
        date: wt.date,
        created_at: "",
        dropoff_address_uuid: null,
        dropoff_poc: null,
        dropoff_time: null,
        notes: null,
        pay_cents: null,
        pickup_address_uuid: null,
        pickup_poc: null,
        pickup_time: null,
        // user_id: null,
        driver_uuid: null,
      } as Tables<"WorkTrackers">);
    });
    return () => unsub();
  }, []);

  // Sync driver unavailability data into the store for PixiJS access
  const unavailKeys = useDriverUnavailability();
  useEffect(() => {
    useDriverUnavailabilityStore.getState().setUnavailableKeys(unavailKeys);
  }, [unavailKeys]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full grid grid-rows-[auto_1fr] gap-2 overflow-hidden min-w-0">
      <CellEditor onWorkTrackerOpen={handleWorkTrackerOpen} />
      <WorkTrackerModal
        selectedWorkTracker={selectedWorkTracker}
        setSelectedWorkTracker={setSelectedWorkTracker}
        setSelectedBlock={() => {}} // Not used in PixiJS version
      />
      {locationModal.isOpen && locationModal.bleacherNumber && locationModal.deviceId && (
        <BleacherLocationModal
          isOpen={locationModal.isOpen}
          onClose={locationModal.closeModal}
          bleacherNumber={locationModal.bleacherNumber}
          deviceId={locationModal.deviceId}
        />
      )}
      <SwapConfirmationModal />
      <WorkTrackerDragConfirmModal />
      <div className="min-w-0 mb-2.5">
        <div className="flex justify-between items-center pt-2 pl-2 pr-2">
          <div className="flex items-center gap-3">
            <DashboardOptions />
            <SeasonToggle />
            <ZoneSelector accountManagerId={userContext?.accountManagerUuid ?? null} />
            <SubrentalSuggestions />
          </div>
          <CreateEventButton />
        </div>
        <EventConfiguration showSetupTeardown={false} />
        <MaintenanceEventPanel />
        <SubrentalEventPanel />
      </div>
      <div className="min-h-0 min-w-0 overflow-hidden">
        <DashboardApp />
      </div>
      <AddressTooltip />
    </div>
  );
}
