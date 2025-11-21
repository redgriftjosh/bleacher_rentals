"use client";
import { updateDataBase } from "@/app/actions/db.actions";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useUserHomeBasesStore } from "@/state/userHomeBasesStore";
import { useUserRolesStore } from "@/state/userRolesStore";
import { useUserStatusesStore } from "@/state/userStatusesStore";
import { useUsersStore } from "@/state/userStore";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { ROLES, STATUSES } from "./constants";
import { createErrorToast, createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSuccessToast } from "@/components/toasts/SuccessToast";

export async function fetchDriverTaxById(userId: number, token: string | null): Promise<number> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Drivers")
    .select("tax")
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") {
    const insertError = await insertDriver(userId, 0, 0, "CAD", "KM", supabase);
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
  userId: number,
  token: string | null
): Promise<DriverPaymentData> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Drivers")
    .select("tax, pay_rate_cents, pay_currency, pay_per_unit")
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") {
    // No driver record exists, create one with defaults
    const insertError = await insertDriver(userId, 0, 0, "CAD", "KM", supabase);
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
  userId: number,
  tax: number,
  payRateCents: number,
  payCurrency: string,
  payPerUnit: string,
  supabaseClient: SupabaseClient
) {
  const { error } = await supabaseClient.from("Drivers").insert({
    user_id: userId,
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

export async function updateUserStatusToInvited(email: string, token: string | null) {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);

  const { error } = await supabase
    .from("Users")
    .update({
      status: STATUSES.invited,
    })
    .eq("email", email);

  if (error) {
    createErrorToastNoThrow(["Failed to update user status to invited.", error.message]);
  } else {
    updateDataBase(["Users", "UserStatuses"]);
  }
}

export async function insertUser(
  email: string,
  firstName: string,
  lastName: string,
  roleId: number,
  homeBaseIds: number[],
  tax: number | null,
  payRateCents: number | null,
  payCurrency: string,
  payPerUnit: string,
  token: string
): Promise<number | null> {
  // console.log("Inserting user", token);
  const supabase = await getSupabaseClient(token);

  const { error: userError, data: userData } = await supabase
    .from("Users")
    .insert({
      email,
      first_name: firstName,
      last_name: lastName,
      role: roleId,
      status: roleId === ROLES.driver ? STATUSES.active : STATUSES.invited,
    })
    .select("user_id") // 👈 ensure we get back the inserted user_id
    .single(); // 👈 safely assume only one user is inserted

  if (userError || !userData) {
    console.error("Insert failed:", userError?.message);
    return null;
  }
  if (roleId === ROLES.driver) {
    const insertError = await insertDriver(
      userData.user_id,
      tax ?? 0,
      payRateCents ?? 0,
      payCurrency,
      payPerUnit,
      supabase
    );
    if (insertError) {
      createErrorToastNoThrow(["Failed to insert driver.", insertError.message]);
      return null;
    }
  }

  // console.log("Inserted invited user:", userData);

  const userId = userData.user_id;

  const homeBaseLinks = homeBaseIds.map((homeBaseId) => ({
    user_id: userId,
    home_base_id: homeBaseId,
  }));

  const { error: linkError } = await supabase.from("UserHomeBases").insert(homeBaseLinks);

  if (linkError) {
    console.error("Failed to link user to home bases:", linkError.message);
  } else {
    // console.log("Linked user to home bases:", homeBaseIds);
    createSuccessToast(["User Created"]);
    updateDataBase(["Users", "UserHomeBases", "UserRoles", "UserStatuses"]);
  }

  return userId;
}

export async function updateUser(
  userId: number,
  {
    email,
    firstName,
    lastName,
    roleId,
    homeBaseIds,
    tax,
    payRateCents,
    payCurrency,
    payPerUnit,
    token,
  }: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    roleId: number | null;
    homeBaseIds: number[];
    tax: number | null;
    payRateCents: number | null;
    payCurrency: string;
    payPerUnit: string;
    token: string;
  }
) {
  const supabase = await getSupabaseClient(token);
  // console.log("Updating user", token);

  const { error: updateError } = await supabase
    .from("Users")
    .update({
      // email, don't update email
      first_name: firstName,
      last_name: lastName,
      role: roleId,
    })
    .eq("user_id", userId);

  if (updateError) throw updateError;

  // Delete existing home base links
  await supabase.from("UserHomeBases").delete().eq("user_id", userId);

  // Re-insert new links
  if (homeBaseIds.length > 0) {
    const inserts = homeBaseIds.map((hbId) => ({
      user_id: userId,
      home_base_id: hbId,
    }));

    await supabase.from("UserHomeBases").insert(inserts);
  }
  if (roleId === ROLES.driver) {
    const taxValue = tax ?? 0;
    const { error: driverError } = await supabase
      .from("Drivers")
      .update({
        tax: taxValue,
        pay_rate_cents: payRateCents ?? 0,
        pay_currency: payCurrency,
        pay_per_unit: payPerUnit,
      })
      .eq("user_id", userId);
    if (driverError) {
      createErrorToastNoThrow(["Failed to update driver.", driverError.message]);
    }
  }
  createSuccessToast(["User Updated"]);

  updateDataBase(["Users", "UserHomeBases", "UserRoles", "UserStatuses"]);
}

// ------- BleacherUsers helpers -------

export type SimpleOption = { id: number; label: string };

export async function fetchBleachersForOptions(token: string | null): Promise<SimpleOption[]> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Bleachers")
    .select("bleacher_id, bleacher_number")
    .order("bleacher_number", { ascending: true });
  if (error) {
    createErrorToastNoThrow(["Failed to fetch bleachers.", error.message]);
    return [];
  }
  return (data ?? []).map((b: any) => ({ id: b.bleacher_id, label: String(b.bleacher_number) }));
}

export async function fetchUserBleacherAssignments(
  userId: number,
  token: string | null
): Promise<{ summer: number[]; winter: number[] }> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("BleacherUsers")
    .select("bleacher_id, season")
    .eq("user_id", userId);
  if (error) {
    createErrorToastNoThrow(["Failed to fetch bleacher assignments.", error.message]);
    return { summer: [], winter: [] };
  }
  const summer = (data ?? [])
    .filter((r: any) => r.season === "SUMMER")
    .map((r: any) => r.bleacher_id);
  const winter = (data ?? [])
    .filter((r: any) => r.season === "WINTER")
    .map((r: any) => r.bleacher_id);
  return { summer, winter };
}

export async function upsertUserBleacherAssignments(
  userId: number,
  summerIds: number[],
  winterIds: number[],
  token: string | null
): Promise<void> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);

  // Replace strategy: delete then insert
  const { error: delError } = await supabase.from("BleacherUsers").delete().eq("user_id", userId);
  if (delError) {
    createErrorToastNoThrow(["Failed to clear previous assignments.", delError.message]);
    return;
  }

  const rows = [
    ...summerIds.map((id) => ({ user_id: userId, bleacher_id: id, season: "SUMMER" })),
    ...winterIds.map((id) => ({ user_id: userId, bleacher_id: id, season: "WINTER" })),
  ];
  if (rows.length > 0) {
    const { error: insError } = await supabase.from("BleacherUsers").insert(rows);
    if (insError) {
      createErrorToastNoThrow(["Failed to save bleacher assignments.", insError.message]);
      return;
    }
  }
}

export async function deactivateUser(userId: number, token: string) {
  const supabase = await getSupabaseClient(token);

  const { error: updateError } = await supabase
    .from("Users")
    .update({
      status: 3,
    })
    .eq("user_id", userId);

  if (updateError) throw updateError;
  updateDataBase(["Users", "UserStatuses"]);
}

export async function reactivateUser(userId: number, token: string) {
  const supabase = await getSupabaseClient(token);

  const { error: updateError } = await supabase
    .from("Users")
    .update({
      status: 2,
    })
    .eq("user_id", userId);

  if (updateError) throw updateError;
  updateDataBase(["Users", "UserStatuses"]);
}

export async function deleteUser(userId: number, token: string) {
  const supabase = await getSupabaseClient(token);

  const { error: updateError } = await supabase.from("Users").delete().eq("user_id", userId);

  if (updateError) throw updateError;
  updateDataBase(["UserStatuses", "Users", "UserHomeBases", "UserRoles"]);
}

export function fetchUsers() {
  const users = useUsersStore((s) => s.users);
  const userStatuses = useUserStatusesStore((s) => s.userStatuses);
  const userRoles = useUserRolesStore((s) => s.userRoles);
  const userHomeBases = useUserHomeBasesStore((s) => s.userHomeBases);
  const homeBases = useHomeBasesStore((s) => s.homeBases);

  // Get status and role display values for each user
  const usersWithDetails = users.map((user) => {
    const status = userStatuses.find((s) => s.id === user.status)?.status || "Unknown";
    const role = userRoles.find((r) => r.id === user.role)?.role || "Unknown";

    // Get this user's associated home_base_ids from the junction table
    const linkedHomeBases = userHomeBases
      .filter((uhb) => uhb.user_id === user.user_id)
      .map((uhb) => {
        const base = homeBases.find((hb) => hb.home_base_id === uhb.home_base_id);
        return base ? { id: base.home_base_id, label: base.home_base_name } : null;
      })
      .filter((hb): hb is { id: number; label: string } => hb !== null); // type guard

    return {
      ...user,
      statusDisplay: status,
      roleDisplay: role,
      homeBases: linkedHomeBases,
    };
  });

  // console.log("usersWithDetails:", usersWithDetails);

  return usersWithDetails;
}
