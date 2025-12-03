import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

export type UserAccessData = {
  user_id: number;
  status: number;
  is_admin: boolean;
  hasAccountManagerRole: boolean;
  hasDriverRole: boolean;
};

/**
 * Fetches user access data from the database based on Clerk user ID.
 * Returns user status, admin flag, and role information.
 */
export async function getUserAccessData(
  clerkUserId: string,
  supabase: SupabaseClient<Database>
): Promise<UserAccessData | null> {
  // First, get the user
  const { data: user, error: userError } = await supabase
    .from("Users")
    .select("user_id, status, is_admin")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (userError || !user) {
    return null;
  }

  // Check if user has an active account manager row
  const { data: accountManager, error: amError } = await supabase
    .from("AccountManagers")
    .select("account_manager_id")
    .eq("user_id", user.user_id)
    .eq("is_active", true)
    .maybeSingle();

  // Check if user has an active driver row
  const { data: driver, error: driverError } = await supabase
    .from("Drivers")
    .select("driver_id")
    .eq("user_id", user.user_id)
    .eq("is_active", true)
    .maybeSingle();

  return {
    user_id: user.user_id,
    status: user.status,
    is_admin: user.is_admin,
    hasAccountManagerRole: !!accountManager,
    hasDriverRole: !!driver,
  };
}
