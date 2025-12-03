import { createErrorToast } from "@/components/toasts/ErrorToast";
import { fetchAddressFromId } from "../../../dashboard/db/client/db";
import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "../../../../../database.types";

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
