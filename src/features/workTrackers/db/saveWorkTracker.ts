import { createErrorToast } from "@/components/toasts/ErrorToast";
import { WorkTracker } from "../types";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { AddressData } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { SupabaseClient } from "@supabase/supabase-js";
import { updateDataBase } from "@/app/actions/db.actions";
import { createSuccessToast } from "@/components/toasts/SuccessToast";

async function saveAddress(
  address: AddressData | null,
  supabase: SupabaseClient
): Promise<number | null> {
  if (!address) return null;

  if (address.addressId) {
    const { error: addressError } = await supabase
      .from("Addresses")
      .update({
        city: address.city ?? "",
        state_province: address.state ?? "",
        street: address.address ?? "",
        zip_postal: address.postalCode ?? "",
      })
      .eq("address_id", address.addressId);

    if (addressError) {
      createErrorToast(["Failed to update address.", addressError?.message ?? ""]);
    }
    return address.addressId;
  } else {
    const { data: addressData, error: addressError } = await supabase
      .from("Addresses")
      .insert({
        city: address.city ?? "",
        state_province: address.state ?? "",
        street: address.address ?? "",
        zip_postal: address.postalCode ?? "",
      })
      .select("address_id")
      .single();

    if (addressError || !addressData) {
      createErrorToast(["Failed to insert address.", addressError?.message ?? ""]);
    }
    if (!addressData?.address_id) {
      createErrorToast(["Inserted an address, but no address_id returned."]);
    }
    return addressData?.address_id;
  }
}

export async function saveWorkTracker(
  workTracker: WorkTracker | null,
  token: string | null
): Promise<number> {
  if (!token) {
    createErrorToast(["No authentication token found"]);
  }
  if (!workTracker) {
    createErrorToast(["Failed to save work tracker. No work tracker provided."]);
  }
  const supabase = await getSupabaseClient(token);
  // const payCents = Math.round(payInput * 100);

  let pickUpAddressId: number | null = workTracker.pickupAddress?.addressId ?? null;
  let dropOffAddressId: number | null = workTracker.dropoffAddress?.addressId ?? null;
  pickUpAddressId = await saveAddress(workTracker.pickupAddress, supabase);
  dropOffAddressId = await saveAddress(workTracker.dropoffAddress, supabase);

  let workTrackerId: number | null = workTracker.workTrackerId;

  if (workTracker.workTrackerId !== null) {
    const { error: workTrackerError } = await supabase
      .from("WorkTrackers")
      .update({
        user_id: workTracker.driver?.driverId ?? null,
        date: workTracker.date,
        pickup_address_id: pickUpAddressId,
        pickup_poc: workTracker.pickupPOC,
        pickup_time: workTracker.pickupTime,
        dropoff_address_id: dropOffAddressId,
        dropoff_poc: workTracker.dropoffPOC,
        dropoff_time: workTracker.dropoffTime,
        notes: workTracker.notes,
        pay_cents: workTracker.payCents,
        bleacher_id: workTracker.bleacherId,
        pickup_event_id: workTracker.pickupEvent?.id ?? null,
        dropoff_event_id: workTracker.dropoffEvent?.id ?? null,
        pickup_poc_override: workTracker.pickupPOCOverride,
        dropoff_poc_override: workTracker.dropoffPOCOverride,
      })
      .eq("work_tracker_id", workTracker.workTrackerId);

    if (workTrackerError) {
      createErrorToast(["Failed to update work tracker.", workTrackerError?.message ?? ""]);
    }
    workTrackerId = workTracker.workTrackerId;
  } else {
    const { data: workTrackerData, error: workTrackerError } = await supabase
      .from("WorkTrackers")
      .insert({
        user_id: workTracker.driver?.driverId ?? null,
        date: workTracker.date,
        pickup_address_id: pickUpAddressId,
        pickup_poc: workTracker.pickupPOC,
        pickup_time: workTracker.pickupTime,
        dropoff_address_id: dropOffAddressId,
        dropoff_poc: workTracker.dropoffPOC,
        dropoff_time: workTracker.dropoffTime,
        notes: workTracker.notes,
        pay_cents: workTracker.payCents,
        bleacher_id: workTracker.bleacherId,
        pickup_event_id: workTracker.pickupEvent?.id ?? null,
        dropoff_event_id: workTracker.dropoffEvent?.id ?? null,
        pickup_poc_override: workTracker.pickupPOCOverride,
        dropoff_poc_override: workTracker.dropoffPOCOverride,
      })
      .select("work_tracker_id")
      .single();

    if (workTrackerError || !workTrackerData) {
      createErrorToast(["Failed to insert work tracker.", workTrackerError?.message ?? ""]);
    }
    if (!workTrackerData?.work_tracker_id) {
      createErrorToast(["Inserted a work tracker, but no work_tracker_id returned."]);
    }
    workTrackerId = workTrackerData?.work_tracker_id;
  }
  updateDataBase(["WorkTrackers", "Addresses"]);
  createSuccessToast(["Work Tracker saved"]);
  return workTrackerId!;
}
