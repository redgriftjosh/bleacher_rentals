"use client";

import { AlertDefinition } from "../types";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import {
  getExpectedPickupStreetForWorkTracker,
  isPickupTransportationMismatch,
} from "../util/workTrackerTransportation";

type WtRow = {
  bleacher_uuid: string | null;
  date: string | null;
  pickup_street: string | null;
  bleacher_number: number | null;
};

export const workTrackerTransportation: AlertDefinition = {
  title: "Pickup Location Mismatch",
  entityType: "work_tracker",

  async evaluate(workTrackerUuid, supabase) {
    // Fetch the work tracker with bleacher number and pickup street from local PS DB.
    const wtRows = await typedGetAll(
      db
        .selectFrom("WorkTrackers as wt")
        .leftJoin("Bleachers as b", "b.id", "wt.bleacher_uuid")
        .leftJoin("Addresses as ap", "ap.id", "wt.pickup_address_uuid")
        .select([
          "wt.bleacher_uuid as bleacher_uuid",
          "wt.date as date",
          "ap.street as pickup_street",
          "b.bleacher_number as bleacher_number",
        ])
        .where("wt.id", "=", workTrackerUuid)
        .limit(1)
        .compile(),
      expect<WtRow>(),
    );

    const wt = wtRows[0];
    if (!wt?.bleacher_uuid || !wt.date || !wt.pickup_street) return null;

    const expectedPickupStreet = await getExpectedPickupStreetForWorkTracker({
      bleacherUuid: wt.bleacher_uuid,
      targetDate: wt.date,
      excludeWorkTrackerUuid: workTrackerUuid,
    });

    if (!isPickupTransportationMismatch(expectedPickupStreet, wt.pickup_street)) return null;

    const desc = wt.bleacher_number != null ? `Bleacher #${wt.bleacher_number}` : "Work Tracker";
    return {
      message: `Bleacher is at ${expectedPickupStreet}, but pickup is set to ${wt.pickup_street}.`,
      entityDescription: desc,
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
