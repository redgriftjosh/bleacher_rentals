"use client";

import { AlertDefinition } from "../types";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { evaluateWorkTrackerDraft, WorkTrackerDraftRow } from "../evaluate/workTrackerDraft";

export { evaluateWorkTrackerDraft, type WorkTrackerDraftRow } from "../evaluate/workTrackerDraft";

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
      expect<WorkTrackerDraftRow>(),
    );

    const wt = rows[0];
    if (!wt) return null;
    return evaluateWorkTrackerDraft(wt);
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
