import { CurrentEventStore } from "../useCurrentEventStore";
import { UserResource } from "@clerk/types";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { checkEventFormRules } from "../functions";
import { Tables, TablesInsert } from "../../../../../../database.types";
import { toast } from "sonner";
import { createErrorToast, ErrorToast } from "@/components/toasts/ErrorToast";
import React from "react";
import { updateDataBase } from "@/app/actions/db.actions";
import { createSuccessToast, SuccessToast } from "@/components/toasts/SuccessToast";
import { SupabaseClient } from "@supabase/supabase-js";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";

export async function updateEvent(
  state: CurrentEventStore,
  token: string | null,
  user: UserResource | null,
  bleacherEvents: Tables<"BleacherEvents">[]
): Promise<void> {
  if (!token) {
    createErrorToast(["No authentication token found"]);
  }

  if (state.eventId === null) {
    createErrorToast(["No eventId provided for update"]);
  }

  const supabase = await getSupabaseClient(token);

  if (!checkEventFormRules(state, user)) {
    throw new Error("Event form validation failed");
  }

  // 1. Update Address (if address exists)
  if (state.addressData) {
    const updatedAddress: Partial<TablesInsert<"Addresses">> = {
      city: state.addressData.city ?? "",
      state_province: state.addressData.state ?? "",
      street: state.addressData.address ?? "",
      zip_postal: state.addressData.postalCode ?? "",
    };

    const { error: addressError } = await supabase
      .from("Addresses")
      .update(updatedAddress)
      .eq("address_id", state.addressData.addressId);

    if (addressError) {
      createErrorToast(["Failed to update address.", addressError?.message ?? ""]);
    }
  }

  // 2. Update Event
  const updatedEvent: Partial<TablesInsert<"Events">> = {
    event_name: state.eventName,
    event_start: state.eventStart,
    event_end: state.eventEnd,
    setup_start: state.sameDaySetup ? null : state.setupStart,
    teardown_end: state.sameDayTeardown ? null : state.teardownEnd,
    lenient: state.lenient,
    total_seats: state.seats,
    seven_row: state.sevenRow,
    ten_row: state.tenRow,
    fifteen_row: state.fifteenRow,
    booked: state.selectedStatus === "Booked",
    notes: state.notes,
    hsl_hue: state.hslHue,
    must_be_clean: state.mustBeClean,
    goodshuffle_url: state.goodshuffleUrl ?? null,
    created_by_user_id: state.ownerUserId ?? null,
  };

  const { error: eventError } = await supabase
    .from("Events")
    .update(updatedEvent)
    .eq("event_id", state.eventId);

  if (eventError) {
    createErrorToast(["Failed to update event.", eventError?.message ?? ""]);
  }

  await updateBleacherEvents(state, supabase, bleacherEvents);

  createSuccessToast(["Event Updated"]);
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
}

async function updateBleacherEvents(
  state: CurrentEventStore,
  supabase: SupabaseClient,
  bleacherEvents: Tables<"BleacherEvents">[]
) {
  const existingLinks = bleacherEvents.filter((be) => be.event_id === state.eventId);

  const existingBleacherIds = new Set(existingLinks?.map((b) => b.bleacher_id) ?? []);
  const incomingBleacherIds = new Set(state.bleacherIds);

  // Identify removals and additions
  const toDelete = [...existingBleacherIds].filter((id) => !incomingBleacherIds.has(id));
  const toAdd = [...incomingBleacherIds].filter((id) => !existingBleacherIds.has(id));

  // Delete removed bleacher links
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("BleacherEvents")
      .delete()
      .eq("event_id", state.eventId)
      .in("bleacher_id", toDelete);

    if (deleteError) {
      createErrorToast(["Failed to delete removed bleacher links.", deleteError?.message ?? ""]);
    }
  }

  // Insert new links
  if (toAdd.length > 0) {
    const newBleacherLinks = toAdd.map((bleacher_id) => ({
      bleacher_id,
      event_id: state.eventId,
      setup_text: "",
      setup_confirmed: false,
      teardown_text: "",
      teardown_confirmed: false,
    }));
    const { error: insertError } = await supabase.from("BleacherEvents").insert(newBleacherLinks);

    if (insertError) {
      createErrorToast(["Failed to insert new bleacher links.", insertError?.message ?? ""]);
    }
  }
}
