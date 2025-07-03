import { createErrorToast } from "@/components/toasts/ErrorToast";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";

export async function fetchWorkTracker(
  token: string,
  beleacherEventId: number,
  type: "setup" | "teardown"
): Promise<number[]> {
  const supabase = await getSupabaseClient(token);

  if (type === "setup") {
    const { data, error } = await supabase
      .from("BleacherEvents")
      .select("setup_work_tracker_id")
      .eq("bleacher_event_id", beleacherEventId)
      .single();

    if (error) {
      createErrorToast(["Failed to fetch work tracker id.", error.message]);
    }

    const workTrackerId = data?.setup_work_tracker_id;
    if (!workTrackerId) {
      createErrorToast(["Failed to fetch work tracker id. No work tracker id found."]);
    }
    const { data: workTrackerData, error: workTrackerError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .eq("work_tracker_id", workTrackerId)
      .single();

    if (workTrackerError) {
      createErrorToast(["Failed to fetch work tracker.", workTrackerError.message]);
    }

    return workTrackerData;
  } else {
    const { data, error } = await supabase
      .from("BleacherEvents")
      .select("teardown_work_tracker_id")
      .eq("bleacher_event_id", beleacherEventId)
      .single();

    if (error) {
      createErrorToast(["Failed to fetch work tracker id.", error.message]);
    }

    const workTrackerId = data?.teardown_work_tracker_id;
    if (!workTrackerId) {
      createErrorToast(["Failed to fetch work tracker id. No work tracker id found."]);
    }
    const { data: workTrackerData, error: workTrackerError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .eq("work_tracker_id", workTrackerId)
      .single();

    if (workTrackerError) {
      createErrorToast(["Failed to fetch work tracker.", workTrackerError.message]);
    }

    return workTrackerData;
  }
}
