"use client";

import { AlertDefinition } from "../types";
import { REVIEW_REQUESTED_TITLE } from "../requestReview";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";

type WtRow = {
  status: string | null;
  bleacher_number: number | null;
  zone_uuid: string | null;
};

export const reviewRequestedWorkTracker: AlertDefinition = {
  title: REVIEW_REQUESTED_TITLE,
  entityType: "work_tracker",

  async evaluate(workTrackerUuid) {
    const rows = await typedGetAll(
      db
        .selectFrom("WorkTrackers as wt")
        .leftJoin("Bleachers as b", "b.id", "wt.bleacher_uuid")
        .select([
          "wt.status as status",
          "b.bleacher_number as bleacher_number",
          "b.zone_uuid as zone_uuid",
        ])
        .where("wt.id", "=", workTrackerUuid)
        .limit(1)
        .compile(),
      expect<WtRow>(),
    );

    const wt = rows[0];
    if (!wt || wt.status !== "draft") return null;

    return {
      message: `Review requested for Work Tracker on Bleacher #${wt.bleacher_number ?? "?"}`,
      entityDescription: `Work Tracker – Bleacher #${wt.bleacher_number ?? "?"}`,
    };
  },

  async recipients(workTrackerUuid) {
    const rows = await typedGetAll(
      db
        .selectFrom("WorkTrackers as wt")
        .innerJoin("Bleachers as b", "b.id", "wt.bleacher_uuid")
        .innerJoin("AccountManagerZones as amz", "amz.zone_uuid", "b.zone_uuid")
        .innerJoin("AccountManagers as am", "am.id", "amz.account_manager_uuid")
        .select(["am.user_uuid as user_uuid"])
        .where("wt.id", "=", workTrackerUuid)
        .where("amz.is_lead", "=", 1)
        .compile(),
      expect<{ user_uuid: string | null }>(),
    );

    return rows.map((r) => r.user_uuid).filter((id): id is string => !!id);
  },
};
