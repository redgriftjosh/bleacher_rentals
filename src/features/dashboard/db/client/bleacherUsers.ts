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

  const { data: assignments, error: assignErr } = await supabase
    .from("BleacherUsers")
    .select("bleacher_id, season")
    .eq("user_id", userRow.user_id);

  if (assignErr) {
    return { summerAssignedBleacherIds: [], winterAssignedBleacherIds: [] };
  }

  const summerAssignedBleacherIds = (assignments ?? [])
    .filter((r: any) => r.season === "SUMMER")
    .map((r: any) => r.bleacher_id);
  const winterAssignedBleacherIds = (assignments ?? [])
    .filter((r: any) => r.season === "WINTER")
    .map((r: any) => r.bleacher_id);

  return { summerAssignedBleacherIds, winterAssignedBleacherIds };
}
