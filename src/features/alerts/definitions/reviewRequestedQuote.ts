"use client";

import { AlertDefinition } from "../types";
import { REVIEW_REQUESTED_TITLE } from "../requestReview";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";

type EventRow = {
  event_name: string | null;
  event_status: string | null;
};

export const reviewRequestedQuote: AlertDefinition = {
  title: REVIEW_REQUESTED_TITLE,
  entityType: "event",

  async evaluate(eventUuid) {
    const rows = await typedGetAll(
      db
        .selectFrom("Events as e")
        .select(["e.event_name", "e.event_status"])
        .where("e.id", "=", eventUuid)
        .limit(1)
        .compile(),
      expect<EventRow>(),
    );

    const evt = rows[0];
    if (!evt) return null;
    if (evt.event_status === "booked") return null;

    return {
      message: `Review requested for Quote "${evt.event_name ?? "Untitled"}"`,
      entityDescription: `Quote – ${evt.event_name ?? "Untitled"}`,
    };
  },

  async recipients(eventUuid) {
    const rows = await typedGetAll(
      db
        .selectFrom("BleacherEvents as be")
        .innerJoin("Bleachers as b", "b.id", "be.bleacher_uuid")
        .innerJoin("AccountManagerZones as amz", "amz.zone_uuid", "b.zone_uuid")
        .innerJoin("AccountManagers as am", "am.id", "amz.account_manager_uuid")
        .select(["am.user_uuid as user_uuid"])
        .where("be.event_uuid", "=", eventUuid)
        .where("amz.is_lead", "=", 1)
        .compile(),
      expect<{ user_uuid: string | null }>(),
    );

    return [...new Set(rows.map((r) => r.user_uuid).filter((id): id is string => !!id))];
  },
};
