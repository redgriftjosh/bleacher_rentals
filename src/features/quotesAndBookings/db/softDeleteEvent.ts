import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { logSingleChange } from "./logEventChanges";

export async function softDeleteEvent(
  eventId: string,
  supabase: SupabaseClient<Database>,
  userId?: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from("Events")
    .update({ deleted: true })
    .eq("id", eventId);

  if (error) {
    createErrorToast(["Failed to delete quote.", error.message ?? ""]);
    return false;
  }

  await logSingleChange(
    supabase,
    eventId,
    userId ?? null,
    "deleted",
    false,
    true,
    "status_change",
  );

  return true;
}
