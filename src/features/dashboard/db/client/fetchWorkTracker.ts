import { createErrorToast } from "@/components/toasts/ErrorToast";
import { fetchAddressFromUuid } from "../../../dashboard/db/client/db";
import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "../../../../../database.types";

export async function fetchWorkTrackerByUuid(
  uuid: string,
  supabase: SupabaseClient
): Promise<{
  workTracker: Tables<"WorkTrackers"> | null;
  pickupAddress: Tables<"Addresses"> | null;
  dropoffAddress: Tables<"Addresses"> | null;
}> {
  const workTracker = await fetchWorkTracker(uuid, supabase);
  let pickupAddress: Tables<"Addresses"> | null = null;
  if (workTracker?.pickup_address_uuid) {
    pickupAddress = await fetchAddressFromUuid(workTracker.pickup_address_uuid, supabase);
  }
  let dropoffAddress: Tables<"Addresses"> | null = null;
  if (workTracker?.dropoff_address_uuid) {
    dropoffAddress = await fetchAddressFromUuid(workTracker.dropoff_address_uuid, supabase);
  }

  console.log("data", workTracker, pickupAddress, dropoffAddress);
  return { workTracker, pickupAddress, dropoffAddress };
}

async function fetchWorkTracker(
  uuid: string,
  supabase: SupabaseClient
): Promise<Tables<"WorkTrackers"> | null> {
  const { data, error } = await supabase.from("WorkTrackers").select("*").eq("id", uuid).single();

  if (error) {
    createErrorToast(["Failed to fetch work tracker.", error.message]);
  }
  return data;
}
