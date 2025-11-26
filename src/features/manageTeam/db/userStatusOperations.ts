import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../database.types";
import { updateDataBase } from "@/app/actions/db.actions";

type TypedSupabaseClient = SupabaseClient<Database>;

const STATUSES = {
  invited: 1,
  active: 2,
  inactive: 3,
};

export async function deactivateUser(
  supabase: TypedSupabaseClient,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("Users")
      .update({ status: STATUSES.inactive })
      .eq("user_id", userId);

    if (error) throw error;

    updateDataBase(["Users", "UserStatuses"]);
    return { success: true };
  } catch (error) {
    console.error("Error deactivating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function reactivateUser(
  supabase: TypedSupabaseClient,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("Users")
      .update({ status: STATUSES.active })
      .eq("user_id", userId);

    if (error) throw error;

    updateDataBase(["Users", "UserStatuses"]);
    return { success: true };
  } catch (error) {
    console.error("Error reactivating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateUserStatusToInvited(
  supabase: TypedSupabaseClient,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("Users")
      .update({ status: STATUSES.invited })
      .eq("email", email);

    if (error) throw error;

    updateDataBase(["Users", "UserStatuses"]);
    return { success: true };
  } catch (error) {
    console.error("Error updating user status to invited:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteUser(
  supabase: TypedSupabaseClient,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Mark user as inactive instead of deleting
    const { error: userError } = await supabase
      .from("Users")
      .update({ status: STATUSES.inactive })
      .eq("user_id", userId);

    if (userError) throw userError;

    // Mark driver as inactive if exists
    const { error: driverError } = await supabase
      .from("Drivers")
      .update({ is_active: false })
      .eq("user_id", userId);

    // Ignore error if driver doesn't exist
    if (driverError && driverError.code !== "PGRST116") throw driverError;

    // Mark account manager as inactive if exists
    const { error: amError } = await supabase
      .from("AccountManagers")
      .update({ is_active: false })
      .eq("user_id", userId);

    // Ignore error if account manager doesn't exist
    if (amError && amError.code !== "PGRST116") throw amError;

    updateDataBase(["UserStatuses", "Users", "Drivers", "AccountManagers"]);
    return { success: true };
  } catch (error) {
    console.error("Error deactivating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
