import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../../database.types";

type UserBleacherAssignments = {
  assignedBleacherUuids: string[];
};

export async function fetchUserBleacherAssignmentsForSeason(
  supabase: SupabaseClient<Database>,
  clerkUserId: string,
): Promise<UserBleacherAssignments> {
  const { data: userRow, error: userErr } = await supabase
    .from("Users")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (userErr || !userRow?.id) {
    return { assignedBleacherUuids: [] };
  }

  const { data: accountManager, error: amErr } = await supabase
    .from("AccountManagers")
    .select("id")
    .eq("user_uuid", userRow.id)
    .eq("is_active", true)
    .single();

  if (amErr || !accountManager?.id) {
    return { assignedBleacherUuids: [] };
  }

  const { data: amZones } = await supabase
    .from("AccountManagerZones")
    .select("zone_uuid")
    .eq("account_manager_uuid", accountManager.id);

  if (!amZones?.length) {
    return { assignedBleacherUuids: [] };
  }

  const zoneIds = amZones.map((z) => z.zone_uuid);

  const { data: bleachers } = await supabase
    .from("Bleachers")
    .select("id")
    .in("zone_uuid", zoneIds);

  return { assignedBleacherUuids: bleachers?.map((b) => b.id) ?? [] };
}
