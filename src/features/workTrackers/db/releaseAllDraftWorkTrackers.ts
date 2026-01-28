import { Database } from "../../../../database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { fetchWorkTrackersForUserUuidAndStartDate } from "./db";

/**
 * Fetches all work trackers for the given user/startDate using the same query
 * as TripList, filters to only drafts, and batch-updates them to "released".
 *
 * Returns the count of released work trackers, or throws on error.
 */
export async function releaseAllDraftWorkTrackers(
  supabase: SupabaseClient<Database>,
  userUuid: string,
  startDate: string,
): Promise<number> {
  const { workTrackers } = await fetchWorkTrackersForUserUuidAndStartDate(
    supabase,
    userUuid,
    startDate,
    false,
  );

  const draftIds = workTrackers
    .filter((row) => row.workTracker.status === "draft")
    .map((row) => row.workTracker.id);

  if (draftIds.length === 0) return 0;

  const { error } = await supabase
    .from("WorkTrackers")
    .update({ status: "released" })
    .in("id", draftIds);

  if (error) {
    throw new Error(error.message);
  }

  return draftIds.length;
}
