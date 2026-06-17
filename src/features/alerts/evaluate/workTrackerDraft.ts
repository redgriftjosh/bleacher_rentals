import { getUpcomingWindowEnd } from "../util/getUpcomingWindow";

export type WorkTrackerDraftRow = {
  id: string;
  status: string | null;
  date: string | null;
  bleacher_number: number | null;
  created_by_user_uuid: string | null;
};

/** Pure evaluation — no DB dependency. Usable on client and server. */
export function evaluateWorkTrackerDraft(
  wt: WorkTrackerDraftRow,
): { message: string; entityDescription: string } | null {
  if (wt.status !== "draft") return null;
  if (!wt.date) return null;

  const windowEnd = getUpcomingWindowEnd();
  if (wt.date > windowEnd) return null;

  const desc = [
    wt.bleacher_number != null ? `Bleacher #${wt.bleacher_number}` : null,
    `Date: ${wt.date}`,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    message: "This work tracker is still in draft and should be released soon.",
    entityDescription: desc || "Work Tracker",
  };
}
