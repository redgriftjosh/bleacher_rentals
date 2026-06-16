"use client";

import { AlertDefinition } from "../types";
import { getUpcomingWindowEnd } from "../util/getUpcomingWindow";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";

type WtRow = {
  id: string;
  status: string | null;
  date: string | null;
  bleacher_number: number | null;
  created_by_user_uuid: string | null;
};

export const workTrackerDraft: AlertDefinition = {
  title: "Work Tracker Still in Draft",
  entityType: "work_tracker",

  async evaluate(workTrackerUuid, _supabase) {
    const rows = await typedGetAll(
      db
        .selectFrom("WorkTrackers as wt")
        .leftJoin("Bleachers as b", "b.id", "wt.bleacher_uuid")
        .select([
          "wt.id as id",
          "wt.status as status",
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
    if (wt.status !== "draft") return null;
    if (!wt.date) return null;

    // windowEnd is a local YYYY-MM-DD string; wt.date is also YYYY-MM-DD
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
