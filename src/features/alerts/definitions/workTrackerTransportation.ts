"use client";

import { AlertDefinition } from "../types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { resolveAddress } from "@/utils/resolveAddress";

type WtRow = {
  bleacher_uuid: string | null;
  date: string | null;
  pickup_address_uuid: string | null;
  bleacher_number: number | null;
};
type BeRow = { eventStart: string | null; address: string | null; eventStatus: string | null };
type WtAddrRow = { date: string | null; dropoffAddress: string | null };
type StreetRow = { street: string | null };

export const workTrackerTransportation: AlertDefinition = {
  title: "Pickup Location Mismatch",
  entityType: "work_tracker",

  async evaluate(workTrackerUuid, supabase) {
    // Fetch the work tracker and its bleacher number from the local PS DB
    const wtRows = await typedGetAll(
      db
        .selectFrom("WorkTrackers as wt")
        .leftJoin("Bleachers as b", "b.id", "wt.bleacher_uuid")
        .select([
          "wt.bleacher_uuid as bleacher_uuid",
          "wt.date as date",
          "wt.pickup_address_uuid as pickup_address_uuid",
          "b.bleacher_number as bleacher_number",
        ])
        .where("wt.id", "=", workTrackerUuid)
        .limit(1)
        .compile(),
      expect<WtRow>(),
    );
    const wt = wtRows[0];
    if (!wt?.bleacher_uuid || !wt.date || !wt.pickup_address_uuid) return null;

    // Fetch all booked bleacher events for this bleacher with resolved address street
    const beRows = await typedGetAll(
      db
        .selectFrom("BleacherEvents as be")
        .innerJoin("Events as e", "e.id", "be.event_uuid")
        .innerJoin("Addresses as a", "a.id", "e.address_uuid")
        .select([
          "e.event_start as eventStart",
          "a.street as address",
          "e.event_status as eventStatus",
        ])
        .where("be.bleacher_uuid", "=", wt.bleacher_uuid)
        .compile(),
      expect<BeRow>(),
    );

    // Fetch all other work trackers for this bleacher with resolved dropoff address street
    const pastWtRows = await typedGetAll(
      db
        .selectFrom("WorkTrackers as wt2")
        .leftJoin("Addresses as a", "a.id", "wt2.dropoff_address_uuid")
        .select(["wt2.date as date", "a.street as dropoffAddress"])
        .where("wt2.bleacher_uuid", "=", wt.bleacher_uuid)
        .where("wt2.id", "!=", workTrackerUuid)
        .compile(),
      expect<WtAddrRow>(),
    );

    // Build the shape resolveAddress needs and find the last known location
    const bleacher = {
      bleacherEvents: beRows
        .filter((r) => r.eventStart != null)
        .map((r) => ({
          booked: r.eventStatus === "booked",
          eventStart: r.eventStart!,
          address: r.address ?? "",
        })),
      workTrackers: pastWtRows,
    };
    const lastAddress = resolveAddress(bleacher, wt.date);

    // Resolve the pickup address street
    const pickupRows = await typedGetAll(
      db
        .selectFrom("Addresses as a")
        .select(["a.street as street"])
        .where("a.id", "=", wt.pickup_address_uuid)
        .limit(1)
        .compile(),
      expect<StreetRow>(),
    );
    const pickupStreet = pickupRows[0]?.street;

    if (!lastAddress || !pickupStreet || lastAddress === pickupStreet) return null;

    const desc = wt.bleacher_number != null ? `Bleacher #${wt.bleacher_number}` : "Work Tracker";
    return {
      message: `Bleacher is at ${lastAddress}, but pickup is set to ${pickupStreet}.`,
      entityDescription: desc,
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
