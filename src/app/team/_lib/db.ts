"use client";
import { updateDataBase } from "@/app/actions/db.actions";
import { STATUSES } from "../../../features/manageTeam/constants";
import { createErrorToast, createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { Database } from "../../../../database.types";

export async function fetchDriverTaxById(
  userUuid: string,
  supabase: SupabaseClient<Database>
): Promise<number> {
  if (!supabase) {
    createErrorToast(["No token found"]);
  }
  // const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Drivers")
    .select("tax")
    .eq("user_uuid", userUuid)
    .single();
  if (error && error.code === "PGRST116") {
    const insertError = await insertDriver(userUuid, 0, 0, "CAD", "KM", supabase);
    if (insertError) {
      return 0;
    }
    return 0;
  } else if (error) {
    createErrorToastNoThrow(["Failed to fetch driver tax.", error.message]);
    return 0;
  }
  return data?.tax ?? 0;
}

export type DriverPaymentData = {
  tax: number;
  payRateCents: number;
  payCurrency: "CAD" | "USD";
  payPerUnit: "KM" | "MI" | "HR";
};

export async function fetchDriverPaymentData(
  userUuid: string,
  supabase: SupabaseClient<Database>
): Promise<DriverPaymentData> {
  if (!supabase) {
    createErrorToast(["No token found"]);
  }
  // const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Drivers")
    .select("tax, pay_rate_cents, pay_currency, pay_per_unit")
    .eq("user_uuid", userUuid)
    .single();
  if (error && error.code === "PGRST116") {
    // No driver record exists, create one with defaults
    const insertError = await insertDriver(userUuid, 0, 0, "CAD", "KM", supabase);
    if (insertError) {
      return { tax: 0, payRateCents: 0, payCurrency: "CAD", payPerUnit: "KM" };
    }
    return { tax: 0, payRateCents: 0, payCurrency: "CAD", payPerUnit: "KM" };
  } else if (error) {
    createErrorToastNoThrow(["Failed to fetch driver payment data.", error.message]);
    return { tax: 0, payRateCents: 0, payCurrency: "CAD", payPerUnit: "KM" };
  }
  return {
    tax: data?.tax ?? 0,
    payRateCents: data?.pay_rate_cents ?? 0,
    payCurrency: (data?.pay_currency as "CAD" | "USD") ?? "CAD",
    payPerUnit: (data?.pay_per_unit as "KM" | "MI" | "HR") ?? "KM",
  };
}

async function insertDriver(
  userUuid: string,
  tax: number,
  payRateCents: number,
  payCurrency: string,
  payPerUnit: string,
  supabaseClient: SupabaseClient<Database>
) {
  const { error } = await supabaseClient.from("Drivers").insert({
    user_uuid: userUuid,
    tax,
    pay_rate_cents: payRateCents,
    pay_currency: payCurrency,
    pay_per_unit: payPerUnit,
  });
  if (error) {
    createErrorToastNoThrow(["Failed to insert driver.", error.message]);
    return error;
  }
  return null;
}

export async function updateUserStatusToInvited(email: string, supabase: SupabaseClient<Database>) {
  if (!supabase) {
    createErrorToast(["No token found"]);
  }
  // const supabase = await getSupabaseClient(token);
  const { error } = await supabase
    .from("Users")
    .update({
      status_uuid: STATUSES.invited,
    })
    .eq("email", email);

  if (error) {
    createErrorToastNoThrow(["Failed to update user status to invited.", error.message]);
  } else {
    updateDataBase(["Users", "UserStatuses"]);
  }
}

// ------- BleacherUsers helpers -------

export type SimpleOption = { uuid: string; label: string };

export async function fetchBleachersForOptions(
  supabase: SupabaseClient<Database>
): Promise<SimpleOption[]> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }
  // const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Bleachers")
    .select("id, bleacher_number")
    .order("bleacher_number", { ascending: true });
  if (error) {
    createErrorToastNoThrow(["Failed to fetch bleachers!", error.message]);
    return [];
  }
  return (data ?? []).map((b: any) => ({ uuid: b.id, label: String(b.bleacher_number) }));
}

export async function fetchUserBleacherAssignments(
  userUuid: string,
  supabase: SupabaseClient<Database>
): Promise<{ summer: number[]; winter: number[] }> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }
  // const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("BleacherUsers")
    .select("bleacher_uuid, season")
    .eq("user_uuid", userUuid);
  if (error) {
    createErrorToastNoThrow(["Failed to fetch bleacher assignments.", error.message]);
    return { summer: [], winter: [] };
  }
  const summer = (data ?? [])
    .filter((r: any) => r.season === "SUMMER")
    .map((r: any) => r.bleacher_uuid);
  const winter = (data ?? [])
    .filter((r: any) => r.season === "WINTER")
    .map((r: any) => r.bleacher_uuid);
  return { summer, winter };
}

export async function upsertUserBleacherAssignments(
  userUuid: string,
  summerUuids: string[],
  winterUuids: string[],
  supabase: SupabaseClient<Database>
): Promise<void> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }
  // const supabase = await getSupabaseClient(token);

  // Replace strategy: delete then insert
  const { error: delError } = await supabase
    .from("BleacherUsers")
    .delete()
    .eq("user_uuid", userUuid);
  if (delError) {
    createErrorToastNoThrow(["Failed to clear previous assignments.", delError.message]);
    return;
  }

  const rows = [
    ...summerUuids.map((id) => ({ user_uuid: userUuid, bleacher_uuid: id, season: "SUMMER" })),
    ...winterUuids.map((id) => ({ user_uuid: userUuid, bleacher_uuid: id, season: "WINTER" })),
  ];
  if (rows.length > 0) {
    const { error: insError } = await supabase.from("BleacherUsers").insert(rows);
    if (insError) {
      createErrorToastNoThrow(["Failed to save bleacher assignments.", insError.message]);
      return;
    }
  }
}

export async function deactivateUser(userUuid: string, supabase: SupabaseClient<Database>) {
  const { error: updateError } = await supabase
    .from("Users")
    .update({
      status_uuid: STATUSES.inactive,
    })
    .eq("id", userUuid);

  if (updateError) throw updateError;
  updateDataBase(["Users", "UserStatuses"]);
}

export async function reactivateUser(userUuid: string, supabase: SupabaseClient<Database>) {
  const { error: updateError } = await supabase
    .from("Users")
    .update({
      status_uuid: STATUSES.active,
    })
    .eq("id", userUuid);

  if (updateError) throw updateError;
  updateDataBase(["Users", "UserStatuses"]);
}

export async function deleteUser(userUuid: string, supabase: SupabaseClient<Database>) {
  const { error: updateError } = await supabase.from("Users").delete().eq("id", userUuid);

  if (updateError) throw updateError;
  updateDataBase(["UserStatuses", "Users", "UserHomeBases"]);
}

// export function fetchUsers() {
//   const users = useUsersStore((s) => s.users);
//   const userStatuses = useUserStatusesStore((s) => s.userStatuses);
//   const userRoles = useUserRolesStore((s) => s.userRoles);
//   const userHomeBases = useUserHomeBasesStore((s) => s.userHomeBases);
//   const homeBases = useHomeBasesStore((s) => s.homeBases);

//   // Get status and role display values for each user
//   const usersWithDetails = users.map((user) => {
//     const status = userStatuses.find((s) => s.id === user.status)?.status || "Unknown";
//     const role = userRoles.find((r) => r.id === user.role)?.role || "Unknown";

//     // Get this user's associated home_base_ids from the junction table
//     const linkedHomeBases = userHomeBases
//       .filter((uhb) => uhb.user_id === user.user_id)
//       .map((uhb) => {
//         const base = homeBases.find((hb) => hb.home_base_id === uhb.home_base_id);
//         return base ? { id: base.home_base_id, label: base.home_base_name } : null;
//       })
//       .filter((hb): hb is { id: number; label: string } => hb !== null); // type guard

//     return {
//       ...user,
//       statusDisplay: status,
//       roleDisplay: role,
//       homeBases: linkedHomeBases,
//     };
//   });

//   // console.log("usersWithDetails:", usersWithDetails);

//   return usersWithDetails;
// }
