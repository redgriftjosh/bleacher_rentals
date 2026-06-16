"use client";

import { AlertDefinition } from "../types";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type WtRow = {
  status: string | null;
  released_at: string | null;
  accepted_at: string | null;
  date: string | null;
  bleacher_number: number | null;
  created_by_user_uuid: string | null;
};

export const workTrackerPending: AlertDefinition = {
  title: "Work Tracker Pending Acceptance",
  entityType: "work_tracker",

  async evaluate(workTrackerUuid, _supabase) {
    const rows = await typedGetAll(
      db
        .selectFrom("WorkTrackers as wt")
        .leftJoin("Bleachers as b", "b.id", "wt.bleacher_uuid")
        .select([
          "wt.status as status",
          "wt.released_at as released_at",
          "wt.accepted_at as accepted_at",
          "wt.date as date",
          "b.bleacher_number as bleacher_number",
          "wt.created_by_user_uuid as created_by_user_uuid",
        ])
        .where("wt.id", "=", workTrackerUuid)
        .limit(1)
        .compile(),
      expect<WtRow>(),
    );

    const wt = rows[0];
    if (!wt) return null;
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
  },

  async recipients(workTrackerUuid, _supabase) {
    const rows = await typedGetAll(
      db
        .selectFrom("WorkTrackers as wt")
        .select(["wt.created_by_user_uuid as created_by_user_uuid"])
        .where("wt.id", "=", workTrackerUuid)
        .limit(1)
        .compile(),
      expect<{ created_by_user_uuid: string | null }>(),
    );
    const uuid = rows[0]?.created_by_user_uuid;
    return uuid ? [uuid] : [];
  },
};
