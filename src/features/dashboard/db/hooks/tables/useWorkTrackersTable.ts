"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type WorkTrackerRow = {
  work_tracker_uuid: string;
  bleacher_uuid: string | null;
  date: string | null;
  status: string | null;
  driver_uuid: string | null;
  pickup_time: string | null;
  dropoff_time: string | null;
  driver_first_name: string | null;
  driver_last_name: string | null;
  dropoff_address_street: string | null;
};

const compiled = db
  .selectFrom("WorkTrackers as wt")
  .leftJoin("Drivers as d", "d.id", "wt.driver_uuid")
  .leftJoin("Users as du", "du.id", "d.user_uuid")
  .leftJoin("Addresses as wta", "wta.id", "wt.dropoff_address_uuid")
  .select([
    "wt.id as work_tracker_uuid",
    "wt.bleacher_uuid",
    "wt.date",
    "wt.status",
    "wt.driver_uuid",
    "wt.pickup_time",
    "wt.dropoff_time",
    "du.first_name as driver_first_name",
    "du.last_name as driver_last_name",
    "wta.street as dropoff_address_street",
  ])
  .compile();

export function useWorkTrackersTable() {
  return useTypedQuery(compiled, expect<WorkTrackerRow>());
}
