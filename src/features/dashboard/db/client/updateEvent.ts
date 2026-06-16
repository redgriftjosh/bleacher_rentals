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
  bleacherEvents: Tables<"BleacherEvents">[],
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
    event_status: state.selectedStatus,
    contract_revenue_cents: state.contractRevenueCents,
    notes: state.notes,
    hsl_hue: state.hslHue,
    must_be_clean: state.mustBeClean,
    goodshuffle_url: state.goodshuffleUrl ?? null,
    created_by_user_uuid: state.ownerUserUuid ?? null,
    booked_at: state.bookedAt ? new Date(state.bookedAt).toISOString() : null,
    ...(state.createdAt ? { created_at: new Date(state.createdAt).toISOString() } : {}),
  };

  const { error: eventError } = await supabase
    .from("Events")
    .update(updatedEvent)
    .eq("id", state.eventUuid);

  if (eventError) {
    createErrorToast(["Failed to update event.", eventError?.message ?? ""]);
  }

  await updateBleacherEvents(state, supabase);
  await syncBleacherRequirements(state, supabase);

  createSuccessToast(["Event Updated"]);
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
}

async function updateBleacherEvents(state: CurrentEventStore, supabase: SupabaseClient<Database>) {
  // IMPORTANT: Don't rely on the in-memory `bleacherEvents` store here.
  // That store is populated via a background fetch that can be briefly empty or stale
  // (e.g. during navigation/session refresh), which makes updates "hit or miss".
  // Always diff against the source of truth.
  const { data: existingLinks, error: existingError } = await supabase
    .from("BleacherEvents")
    .select("bleacher_uuid")
    .eq("event_uuid", state.eventUuid!);

  if (existingError) {
    createErrorToast(["Failed to load existing bleacher links.", existingError?.message ?? ""]);
    throw new Error(existingError?.message ?? "Failed to load existing bleacher links");
  }

  const existingBleacherUuids = new Set(
    existingLinks?.map((b) => b.bleacher_uuid).filter((uuid): uuid is string => uuid !== null) ??
      [],
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
      throw new Error(deleteError?.message ?? "Failed to delete removed bleacher links");
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
      throw new Error(insertError?.message ?? "Failed to insert new bleacher links");
    }
  }
}

async function syncBleacherRequirements(
  state: CurrentEventStore,
  supabase: SupabaseClient<Database>,
) {
  if (!state.eventUuid) return;

  const { data: existing, error: fetchErr } = await supabase
    .from("EventBleacherRequirements")
    .select("id, bleacher_type_uuid, quantity")
    .eq("event_uuid", state.eventUuid);

  if (fetchErr) {
    console.error("Failed to fetch bleacher requirements:", fetchErr.message);
    return;
  }

  const existingMap = new Map(
    (existing ?? []).map((r) => [r.bleacher_type_uuid, { id: r.id, quantity: r.quantity }]),
  );
  const incoming = state.bleacherRequirements.filter((r) => r.quantity > 0);
  const incomingKeys = new Set(incoming.map((r) => r.bleacherTypeUuid));

  const toInsert = incoming
    .filter((r) => !existingMap.has(r.bleacherTypeUuid))
    .map((r) => ({
      event_uuid: state.eventUuid!,
      bleacher_type_uuid: r.bleacherTypeUuid,
      quantity: r.quantity,
    }));

  const toUpdate = incoming
    .filter((r) => {
      const ex = existingMap.get(r.bleacherTypeUuid);
      return ex && ex.quantity !== r.quantity;
    })
    .map((r) => ({ id: existingMap.get(r.bleacherTypeUuid)!.id, quantity: r.quantity }));

  const toDelete = [...existingMap.entries()]
    .filter(([key]) => !incomingKeys.has(key))
    .map(([, val]) => val.id);

  if (toInsert.length > 0) {
    await supabase.from("EventBleacherRequirements").insert(toInsert);
  }
  for (const upd of toUpdate) {
    await supabase.from("EventBleacherRequirements").update({ quantity: upd.quantity }).eq("id", upd.id);
  }
  if (toDelete.length > 0) {
    await supabase.from("EventBleacherRequirements").delete().in("id", toDelete);
  }
}
