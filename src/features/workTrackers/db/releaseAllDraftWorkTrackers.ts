import { Database } from "../../../../database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { fetchWorkTrackersForUserUuidAndStartDate } from "./db";
import { buildReleaseAllNotification, insertDriverNotification } from "./notifications";

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

  // Local-first writes: mutate the PowerSync DB; BackendConnector syncs both
  // the status PATCH and the notification INSERT back to Supabase.
  const compiled = db
    .updateTable("WorkTrackers")
    .set({ status: "released" })
    .where("id", "in", draftIds)
    .compile();
  await typedExecute(compiled);

  await insertDriverNotification(userUuid, buildReleaseAllNotification(draftIds.length, startDate));

  return draftIds.length;
}
