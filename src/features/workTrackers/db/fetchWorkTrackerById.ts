import { createErrorToast } from "@/components/toasts/ErrorToast";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { WorkTrackerDriver, WorkTracker, WorkTrackerEvent } from "../types";
import { fetchAddressFromId } from "@/app/(dashboards)/bleachers-dashboard/_lib/db";
import { AddressData } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { SupabaseClient } from "@supabase/supabase-js";
import { Tables } from "../../../../database.types";

async function fetchDriverFromId(
  id: number,
  supabase: SupabaseClient
): Promise<WorkTrackerDriver | null> {
  const { data, error } = await supabase
    .from("Users")
    .select("user_id, first_name, last_name")
    .eq("user_id", id)
    .single();
  if (error) {
    createErrorToast(["Failed to fetch driver.", error.message]);
  }
  const driver: WorkTrackerDriver = {
    driverId: data?.user_id ?? null,
    firstName: data?.first_name ?? "",
    lastName: data?.last_name ?? "",
  };
  return driver;
}
async function fetchAddressDataFromId(id: number, supabase: SupabaseClient): Promise<AddressData> {
  const address = await fetchAddressFromId(id, supabase);
  return {
    addressId: address?.address_id ?? null,
    address: address?.street ?? "",
    city: address?.city ?? "",
    state: address?.state_province ?? "",
    postalCode: address?.zip_postal ?? "",
  };
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
async function fetchEventFromId(
  id: number,
  supabase: SupabaseClient
): Promise<WorkTrackerEvent | null> {
  const { data, error } = await supabase
    .from("Events")
    .select("event_id, event_name, event_start, event_end, hsl_hue, address_id, poc")
    .eq("event_id", id)
    .single();
  if (error) {
    createErrorToast(["Failed to fetch event.", error.message]);
  }
  const address = await fetchAddressDataFromId(data.address_id, supabase);
  const event: WorkTrackerEvent = {
    id: data?.event_id ?? null,
    name: data?.event_name ?? "",
    start: data?.event_start ?? "",
    end: data?.event_end ?? "",
    hslHue: data?.hsl_hue ?? null,
    poc: data?.poc ?? null,
    address: address,
  };
  return event;
}

export async function fetchWorkTrackerById(
  id: number | null,
  token: string | null
): Promise<WorkTracker> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  if (!id) {
    createErrorToast(["No work tracker id found."]);
  }
  const supabase = await getSupabaseClient(token);
  const workTracker = await fetchWorkTracker(id, supabase);
  if (!workTracker) {
    createErrorToast(["Failed to fetch work tracker."]);
  }
  if (!workTracker.bleacher_id) {
    throw new Error("Failed to fetch work tracker. No bleacher id found.");
  }
  let pickupAddress: AddressData | null = null;
  if (workTracker.pickup_address_id) {
    pickupAddress = await fetchAddressDataFromId(workTracker.pickup_address_id, supabase);
  }

  let dropoffAddress: AddressData | null = null;
  if (workTracker.dropoff_address_id) {
    dropoffAddress = await fetchAddressDataFromId(workTracker.dropoff_address_id, supabase);
  }

  let driver: WorkTrackerDriver | null = null;
  if (workTracker.user_id) {
    driver = await fetchDriverFromId(workTracker.user_id, supabase);
  }

  let pickupEvent: WorkTrackerEvent | null = null;
  if (workTracker.pickup_event_id) {
    pickupEvent = await fetchEventFromId(workTracker.pickup_event_id, supabase);
  }

  let dropoffEvent: WorkTrackerEvent | null = null;
  if (workTracker.dropoff_event_id) {
    dropoffEvent = await fetchEventFromId(workTracker.dropoff_event_id, supabase);
  }
  const workTrackerData: WorkTracker = {
    workTrackerId: workTracker.work_tracker_id,
    bleacherId: workTracker.bleacher_id,
    driver: driver,
    date: workTracker?.date ?? "",
    pickupTime: workTracker?.pickup_time ?? "",
    dropoffTime: workTracker?.dropoff_time ?? "",
    pickupAddress: pickupAddress,
    dropoffAddress: dropoffAddress,
    pickupPOC: workTracker?.pickup_poc ?? "",
    dropoffPOC: workTracker?.dropoff_poc ?? "",
    payCents: workTracker?.pay_cents ?? 0,
    notes: workTracker?.notes ?? "",
    pickupEvent: pickupEvent,
    dropoffEvent: dropoffEvent,
    pickupPOCOverride: workTracker?.pickup_poc_override ?? false,
    dropoffPOCOverride: workTracker?.dropoff_poc_override ?? false,
  };

  // console.log("data", workTracker, pickupAddress, dropoffAddress);
  return workTrackerData;
}
