import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../../database.types";

type UserBleacherAssignments = {
  summerAssignedBleacherUuids: string[];
  winterAssignedBleacherUuids: string[];
};

export async function fetchUserBleacherAssignmentsForSeason(
  supabase: SupabaseClient<Database>,
  clerkUserId: string
): Promise<UserBleacherAssignments> {
  // Lookup app user_id from clerk_user_id
  const { data: userRow, error: userErr } = await supabase
    .from("Users")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (userErr || !userRow?.id) {
    return { summerAssignedBleacherUuids: [], winterAssignedBleacherUuids: [] };
  }

  // Find the account manager record for this user
  const { data: accountManager, error: amErr } = await supabase
    .from("AccountManagers")
    .select("id")
    .eq("user_uuid", userRow.id)
    .eq("is_active", true)
    .single();

  if (amErr) {
    console.log("Account Manager fetch error:", amErr);
  }

  if (amErr || !accountManager?.id) {
    return { summerAssignedBleacherUuids: [], winterAssignedBleacherUuids: [] };
  }

  // Get all bleachers assigned to this account manager
  const { data: bleachers, error: bleachersErr } = await supabase
    .from("Bleachers")
    .select("id, summer_account_manager_uuid, winter_account_manager_uuid");

  if (bleachersErr || !bleachers) {
    return { summerAssignedBleacherUuids: [], winterAssignedBleacherUuids: [] };
  }

  const summerAssignedBleacherUuids = bleachers
    .filter((b) => b.summer_account_manager_uuid === accountManager.id)
    .map((b) => b.id);

  const winterAssignedBleacherUuids = bleachers
    .filter((b) => b.winter_account_manager_uuid === accountManager.id)
    .map((b) => b.id);
  return { summerAssignedBleacherUuids, winterAssignedBleacherUuids };
}
