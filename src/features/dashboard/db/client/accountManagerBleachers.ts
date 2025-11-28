import { SupabaseClient } from "@supabase/supabase-js";

type UserBleacherAssignments = {
  summerAssignedBleacherIds: number[];
  winterAssignedBleacherIds: number[];
};

export async function fetchUserBleacherAssignmentsForSeason(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<UserBleacherAssignments> {
  // Lookup app user_id from clerk_user_id
  const { data: userRow, error: userErr } = await supabase
    .from("Users")
    .select("user_id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (userErr || !userRow?.user_id) {
    return { summerAssignedBleacherIds: [], winterAssignedBleacherIds: [] };
  }

  // Find the account manager record for this user
  const { data: accountManager, error: amErr } = await supabase
    .from("AccountManagers")
    .select("account_manager_id")
    .eq("user_id", userRow.user_id)
    .eq("is_active", true)
    .single();

  if (amErr || !accountManager?.account_manager_id) {
    return { summerAssignedBleacherIds: [], winterAssignedBleacherIds: [] };
  }

  // Get all bleachers assigned to this account manager
  const { data: bleachers, error: bleachersErr } = await supabase
    .from("Bleachers")
    .select("bleacher_id, summer_account_manager_id, winter_account_manager_id");

  if (bleachersErr || !bleachers) {
    return { summerAssignedBleacherIds: [], winterAssignedBleacherIds: [] };
  }

  const summerAssignedBleacherIds = bleachers
    .filter((b) => b.summer_account_manager_id === accountManager.account_manager_id)
    .map((b) => b.bleacher_id);

  const winterAssignedBleacherIds = bleachers
    .filter((b) => b.winter_account_manager_id === accountManager.account_manager_id)
    .map((b) => b.bleacher_id);

  return { summerAssignedBleacherIds, winterAssignedBleacherIds };
}
