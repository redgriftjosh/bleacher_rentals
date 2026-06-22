const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export type WorkTrackerPendingRow = {
  status: string | null;
  released_at: string | null;
  accepted_at: string | null;
  date: string | null;
  bleacher_number: number | null;
  created_by_user_uuid: string | null;
};

/** Pure evaluation — no DB dependency. Usable on client and server. */
export function evaluateWorkTrackerPending(
  wt: WorkTrackerPendingRow,
): { message: string; entityDescription: string } | null {
  if (wt.status !== "released") return null;
  if (wt.accepted_at) return null;
  if (!wt.released_at) return null;

  const releasedAt = new Date(wt.released_at).getTime();
  if (Date.now() - releasedAt < TWENTY_FOUR_HOURS_MS) return null;

  const desc = [
    wt.bleacher_number != null ? `Bleacher #${wt.bleacher_number}` : null,
    wt.date ? `Date: ${wt.date}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    message: "Driver has not accepted this work tracker within 24 hours of release.",
    entityDescription: desc || "Work Tracker",
  };
}
