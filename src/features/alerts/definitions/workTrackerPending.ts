import { AlertDefinition } from "../types";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const workTrackerPending: AlertDefinition = {
  title: "Work Tracker Pending Acceptance",
  entityType: "work_tracker",

  async evaluate(workTrackerUuid, supabase) {
    const { data: wt } = await supabase
      .from("WorkTrackers")
      .select("id, status, released_at, accepted_at, date, Bleachers(bleacher_number)")
      .eq("id", workTrackerUuid)
      .single();

    if (!wt) return null;
    if (wt.status !== "released") return null;
    if (wt.accepted_at) return null;
    if (!wt.released_at) return null;

    const releasedAt = new Date(wt.released_at).getTime();
    if (Date.now() - releasedAt < TWENTY_FOUR_HOURS_MS) return null;

    const bleacherNum =
      wt.Bleachers && !Array.isArray(wt.Bleachers) ? wt.Bleachers.bleacher_number : null;
    const desc = [
      bleacherNum != null ? `Bleacher #${bleacherNum}` : null,
      wt.date ? `Date: ${wt.date}` : null,
    ]
      .filter(Boolean)
      .join(" — ");

    return {
      message: "Driver has not accepted this work tracker within 24 hours of release.",
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
