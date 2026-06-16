import { AlertDefinition } from "../types";
import { getUpcomingWindowEnd } from "../util/getUpcomingWindow";

export const workTrackerDraft: AlertDefinition = {
  title: "Work Tracker Still in Draft",
  entityType: "work_tracker",

  async evaluate(workTrackerUuid, supabase) {
    const { data: wt } = await supabase
      .from("WorkTrackers")
      .select("id, status, date, Bleachers(bleacher_number)")
      .eq("id", workTrackerUuid)
      .single();

    if (!wt) return null;
    if (wt.status !== "draft") return null;
    if (!wt.date) return null;

    const windowEnd = getUpcomingWindowEnd();
    if (wt.date > windowEnd) return null;

    const bleacherNum =
      wt.Bleachers && !Array.isArray(wt.Bleachers) ? wt.Bleachers.bleacher_number : null;
    const desc = [
      bleacherNum != null ? `Bleacher #${bleacherNum}` : null,
      `Date: ${wt.date}`,
    ]
      .filter(Boolean)
      .join(" — ");

    return {
      message: "This work tracker is still in draft and should be released soon.",
      entityDescription: desc || "Work Tracker",
    };
  },

  async recipients(workTrackerUuid, supabase) {
    const { data } = await supabase
      .from("WorkTrackers")
      .select("created_by_user_uuid")
      .eq("id", workTrackerUuid)
      .single();
    return data?.created_by_user_uuid ? [data.created_by_user_uuid] : [];
  },
};
