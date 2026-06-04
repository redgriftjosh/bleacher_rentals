import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";

export async function softDeleteEvent(
  eventId: string,
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { error } = await supabase
    .from("Events")
    .update({ deleted: true })
    .eq("id", eventId);

  if (error) {
    createErrorToast(["Failed to delete quote.", error.message ?? ""]);
    return false;
  }

  return true;
}
