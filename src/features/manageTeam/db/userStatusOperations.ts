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
    const { error } = await supabase.from("Users").delete().eq("user_id", userId);

    if (error) throw error;

    updateDataBase(["UserStatuses", "Users", "UserHomeBases", "UserRoles"]);
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
