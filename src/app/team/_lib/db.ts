"use client";
import { updateDataBase } from "@/app/actions/db.actions";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useUserHomeBasesStore } from "@/state/userHomeBasesStore";
import { useUserRolesStore } from "@/state/userRolesStore";
import { useUserStatusesStore } from "@/state/userStatusesStore";
import { useUsersStore } from "@/state/userStore";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";

export async function insertUser(
  email: string,
  firstName: string,
  lastName: string,
  roleId: number,
  homeBaseIds: number[],
  token: string
) {
  // console.log("Inserting user", token);
  const supabase = await getSupabaseClient(token);

  const { error: userError, data: userData } = await supabase
    .from("Users")
    .insert({
      email,
      first_name: firstName,
      last_name: lastName,
      role: roleId,
      status: 1,
    })
    .select("user_id") // 👈 ensure we get back the inserted user_id
    .single(); // 👈 safely assume only one user is inserted

  if (userError || !userData) {
    console.error("Insert failed:", userError?.message);
    return;
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
    updateDataBase(["Users", "UserHomeBases", "UserRoles", "UserStatuses"]);
  }
}

export async function updateUser(
  userId: number,
  {
    email,
    firstName,
    lastName,
    roleId,
    homeBaseIds,
    token,
  }: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    roleId: number | null;
    homeBaseIds: number[];
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

  updateDataBase(["Users", "UserHomeBases", "UserRoles", "UserStatuses"]);
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
