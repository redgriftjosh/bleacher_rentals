import { createErrorToast } from "@/components/toasts/ErrorToast";
import { fetchAddressFromId } from "../../../dashboard/db/client/db";
import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "../../../../../database.types";

export async function fetchWorkTrackerOld(
  supabase: SupabaseClient,
  beleacherEventId: number,
  type: "setup" | "teardown"
): Promise<number[]> {
  if (type === "setup") {
    const { data, error } = await supabase
      .from("BleacherEvents")
      .select("setup_work_tracker_id")
      .eq("bleacher_event_id", beleacherEventId)
      .single();

    if (error) {
      createErrorToast(["Failed to fetch work tracker id.", error.message]);
    }

    const workTrackerId = data?.setup_work_tracker_id;
    if (!workTrackerId) {
      createErrorToast(["Failed to fetch work tracker id. No work tracker id found."]);
    }
    const { data: workTrackerData, error: workTrackerError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .eq("work_tracker_id", workTrackerId)
      .single();

    if (workTrackerError) {
      createErrorToast(["Failed to fetch work tracker.", workTrackerError.message]);
    }

    return workTrackerData;
  } else {
    const { data, error } = await supabase
      .from("BleacherEvents")
      .select("teardown_work_tracker_id")
      .eq("bleacher_event_id", beleacherEventId)
      .single();

    if (error) {
      createErrorToast(["Failed to fetch work tracker id.", error.message]);
    }

    const workTrackerId = data?.teardown_work_tracker_id;
    if (!workTrackerId) {
      createErrorToast(["Failed to fetch work tracker id. No work tracker id found."]);
    }
    const { data: workTrackerData, error: workTrackerError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .eq("work_tracker_id", workTrackerId)
      .single();

    if (workTrackerError) {
      createErrorToast(["Failed to fetch work tracker.", workTrackerError.message]);
    }

    return workTrackerData;
  }
}

export async function fetchWorkTrackerById(
  id: number,
  supabase: SupabaseClient
): Promise<{
  workTracker: Tables<"WorkTrackers"> | null;
  pickupAddress: Tables<"Addresses"> | null;
  dropoffAddress: Tables<"Addresses"> | null;
}> {
  const workTracker = await fetchWorkTracker(id, supabase);
  let pickupAddress: Tables<"Addresses"> | null = null;
  if (workTracker?.pickup_address_id) {
    pickupAddress = await fetchAddressFromId(workTracker.pickup_address_id, supabase);
  }
  let dropoffAddress: Tables<"Addresses"> | null = null;
  if (workTracker?.dropoff_address_id) {
    dropoffAddress = await fetchAddressFromId(workTracker.dropoff_address_id, supabase);
  }

  console.log("data", workTracker, pickupAddress, dropoffAddress);
  return { workTracker, pickupAddress, dropoffAddress };
}

async function fetchWorkTracker(
  id: number,
  supabase: SupabaseClient
): Promise<Tables<"WorkTrackers"> | null> {
  const { data, error } = await supabase
    .from("WorkTrackers")
    .select("*")
    .eq("work_tracker_id", id)
    .single();

  if (error) {
    createErrorToast(["Failed to fetch work tracker.", error.message]);
  }
  return data;
}
