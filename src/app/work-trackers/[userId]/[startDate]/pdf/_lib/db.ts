import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchDriverName(
  userId: string,
  supabaseClient: SupabaseClient
): Promise<string> {
  const { data, error } = await supabaseClient
    .from("Users")
    .select("first_name, last_name")
    .eq("user_id", userId)
    .single();
  // console.log("data", data);

  if (error) {
    throw new Error(["Failed to fetch work trackers", error.message].join("\n"));
    // return [];
  }
  const name = data?.first_name + " " + data?.last_name;
  return name;
}
