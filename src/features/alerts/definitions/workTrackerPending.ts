"use client";

import { AlertDefinition } from "../types";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { evaluateWorkTrackerPending, WorkTrackerPendingRow } from "../evaluate/workTrackerPending";

export {
  evaluateWorkTrackerPending,
  type WorkTrackerPendingRow,
} from "../evaluate/workTrackerPending";

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
      expect<WorkTrackerPendingRow>(),
    );

    const wt = rows[0];
    if (!wt) return null;
    return evaluateWorkTrackerPending(wt);
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
