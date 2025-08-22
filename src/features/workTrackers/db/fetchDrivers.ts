import { createErrorToast } from "@/components/toasts/ErrorToast";
import { WorkTrackerDriver } from "../types";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { ROLES } from "@/app/team/_lib/constants";

export async function fetchDrivers(token: string | null): Promise<WorkTrackerDriver[]> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Users")
    .select("user_id, first_name, last_name")
    .eq("role", ROLES.driver);

  if (error) {
    createErrorToast(["Failed to fetch Drivers.", error.message]);
  }
  return data.map((d) => ({
    driverId: d.user_id,
    firstName: d.first_name,
    lastName: d.last_name,
  }));
}
