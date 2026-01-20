import { CurrentEventStore } from "../../../eventConfiguration/state/useCurrentEventStore";
import { UserResource } from "@clerk/types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { updateDataBase } from "@/app/actions/db.actions";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables, TablesInsert } from "../../../../../database.types";
import { checkEventFormRules } from "../../functions";

export async function updateEvent(
  state: CurrentEventStore,
  supabase: SupabaseClient<Database>,
  user: UserResource | null,
  bleacherEvents: Tables<"BleacherEvents">[]
): Promise<void> {
  if (!supabase) {
    createErrorToast(["No Supabase Client found"]);
  }

  if (state.eventUuid === null) {
    createErrorToast(["No eventUuid provided for update"]);
  }

  if (!checkEventFormRules(state, user)) {
    throw new Error("Event form validation failed");
  }

  // 1. Update Address (if address exists)
  if (state.addressData && state.addressData.addressUuid) {
    const updatedAddress: Partial<TablesInsert<"Addresses">> = {
      city: state.addressData.city ?? "",
      state_province: state.addressData.state ?? "",
      street: state.addressData.address ?? "",
      zip_postal: state.addressData.postalCode ?? "",
    };

    const { error: addressError } = await supabase
      .from("Addresses")
      .update(updatedAddress)
      .eq("id", state.addressData.addressUuid);

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
    created_by_user_uuid: state.ownerUserUuid ?? null,
  };

  const { error: eventError } = await supabase
    .from("Events")
    .update(updatedEvent)
    .eq("id", state.eventUuid);

  if (eventError) {
    createErrorToast(["Failed to update event.", eventError?.message ?? ""]);
  }

  await updateBleacherEvents(state, supabase, bleacherEvents);

  createSuccessToast(["Event Updated"]);
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
}

async function updateBleacherEvents(
  state: CurrentEventStore,
  supabase: SupabaseClient<Database>,
  bleacherEvents: Tables<"BleacherEvents">[]
) {
  const existingLinks = bleacherEvents.filter((be) => be.event_uuid === state.eventUuid);

  const existingBleacherUuids = new Set(
    existingLinks?.map((b) => b.bleacher_uuid).filter((uuid): uuid is string => uuid !== null) ?? []
  );
  const incomingBleacherUuids = new Set(state.bleacherUuids);

  // Identify removals and additions
  const toDelete = [...existingBleacherUuids].filter((id) => !incomingBleacherUuids.has(id));
  const toAdd = [...incomingBleacherUuids].filter((id) => !existingBleacherUuids.has(id));

  // Delete removed bleacher links
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("BleacherEvents")
      .delete()
      .eq("event_uuid", state.eventUuid!)
      .in("bleacher_uuid", toDelete);

    if (deleteError) {
      createErrorToast(["Failed to delete removed bleacher links.", deleteError?.message ?? ""]);
    }
  }

  // Insert new links
  if (toAdd.length > 0) {
    const newBleacherLinks = toAdd.map((bleacher_uuid) => ({
      bleacher_uuid,
      event_uuid: state.eventUuid!,
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
