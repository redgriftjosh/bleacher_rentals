import {
  AddressData,
  CurrentEventStore,
} from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { UserResource } from "@clerk/types";
import { supabaseClient } from "@/utils/supabase/supabaseClient";
import { TablesInsert } from "../../../../database.types";
import { toast } from "sonner";
import React from "react";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { updateDataBase } from "@/app/actions/db.actions";
import { SupabaseClient } from "@supabase/supabase-js";

export async function createEvent(
  state: CurrentEventStore,
  token: string | null,
  user: UserResource | null
): Promise<void> {
  if (!token) {
    console.warn("No token found");
    throw new Error("No authentication token found");
  }
  //   if (!checkEventFormRules(state, user)) {
  //     throw new Error("Event form validation failed");
  //   }

  const supabase = supabaseClient(token);

  const event_address_id = await insertEventAddress(supabase, state);
  const event_id = await insertEvent(supabase, state, event_address_id);

  // await insertActivities(supabase, state, event_id);
  await insertBleacherRequirements(supabase, state, event_id);

  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Event Created"],
      }),
    { duration: 10000 }
  );
  updateDataBase(["Bleachers", "BleacherEvents", "Addresses", "Events"]);
}

async function insertEventAddress(
  supabase: SupabaseClient,
  state: CurrentEventStore
): Promise<number> {
  return await insertAddress(state.addressData, supabase);
}

async function insertAddress(
  address: AddressData | null,
  supabase: SupabaseClient
): Promise<number> {
  if (!address) {
    throwError(["Failed to insert address. No address provided"]);
  }
  const newAddress: TablesInsert<"Addresses"> = {
    city: address.city ?? "",
    state_province: address.state ?? "",
    street: address.address ?? "",
    zip_postal: address.postalCode ?? "",
  };

  const { data, error } = await supabase
    .from("Addresses")
    .insert(newAddress)
    .select("address_id")
    .single();

  if (error || !data) {
    throwError(["Failed to insert address", error?.message ?? ""]);
  }

  return data.address_id;
}

async function insertEvent(
  supabase: SupabaseClient,
  state: CurrentEventStore,
  event_address_id: number
): Promise<number> {
  const newEvent: TablesInsert<"Events"> = {
    event_name: state.eventName,
    lenient: state.lenient,
    total_seats: state.seats,
    seven_row: state.sevenRow,
    ten_row: state.tenRow,
    fifteen_row: state.fifteenRow,
    address_id: event_address_id,
    booked: state.selectedStatus === "Booked",
    notes: state.notes,
    hsl_hue: state.hslHue,
    must_be_clean: state.mustBeClean,
  };

  const { data: eventData, error: eventError } = await supabase
    .from("Events")
    .insert(newEvent)
    .select("event_id")
    .single();

  if (eventError || !eventData) {
    console.error("Failed to insert event:", eventError);
    toast.error("Failed to insert event. Rolling back...");

    // 3. Rollback Address
    const { error: rollbackError } = await supabase
      .from("Addresses")
      .delete()
      .eq("address_id", event_address_id);

    if (rollbackError) {
      throwError(["Rollback failed. Address entry may still exist.", rollbackError?.message ?? ""]);
    }
    throwError(["Failed to insert event.", eventError?.message ?? ""]);
  } else {
    return eventData.event_id;
  }
}

// async function insertActivities(
//   supabase: SupabaseClient,
//   state: CurrentEventStore,
//   event_id: number
// ) {
//   const activityInserts: TablesInsert<"Activities">[] = [];

//   for (const activity of state.activities) {
//     const fromAddressId = await insertAddress(activity.fromAddress, supabase);
//     const toAddressId = await insertAddress(activity.toAddress, supabase);

//     activityInserts.push({
//       activity_type_id: 1, // You'll probably want to make this dynamic
//       bleacher_id: activity.bleacherId ?? null,
//       date: activity.date ?? null,
//       event_id,
//       from_address_id: fromAddressId,
//       to_address_id: toAddressId,
//       user_id: activity.userId ?? null,
//     });
//   }

//   const { error: activityError } = await supabase.from("Activities").insert(activityInserts);

//   if (activityError) {
//     throwError(["Failed to insert activities", activityError.message ?? ""]);
//   }
// }

async function insertBleacherRequirements(
  supabase: SupabaseClient,
  state: CurrentEventStore,
  event_id: number
) {
  const requirementInserts: TablesInsert<"EventBleacherRequirements">[] = [];

  for (const requirement of state.bleacherRequirements) {
    requirementInserts.push({
      event_id: event_id ?? null,
      must_be_clean: requirement.mustBeClean,
      qty: requirement.qty,
      rows: requirement.rows,
      setup_from: requirement.setupFrom,
      setup_to: requirement.setupTo,
      teardown_from: requirement.teardownFrom,
      teardown_to: requirement.teardownTo,
    });
  }

  const { error: requirementError } = await supabase
    .from("EventBleacherRequirements")
    .insert(requirementInserts);

  if (requirementError) {
    throwError(["Failed to insert requirements", requirementError.message ?? ""]);
  }
}

function throwError(lines: string[]): never {
  console.error(lines);
  toast.custom(
    (t) =>
      React.createElement(ErrorToast, {
        id: t,
        lines: lines,
      }),
    { duration: 10000 }
  );
  throw new Error(lines.join(" | "));
}
