"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsWorkTrackerRow = {
  id: string;
  bleacher_uuid: string | null;
  date: string | null;
  status: string | null;
  // PowerSync stores the enum as plain text (see AppSchema.ts) — cast to
  // WorkTrackerTimeMode at the point of use, same as `status`.
  pickup_time_mode: string | null;
  pickup_time_start: string | null;
  pickup_time_end: string | null;
  dropoff_time_mode: string | null;
  dropoff_time_start: string | null;
  dropoff_time_end: string | null;
  driver_uuid: string | null;
  dropoff_address_uuid: string | null;
  pre_inspection_uuid: string | null;
  post_inspection_uuid: string | null;
};

const compiled = db
  .selectFrom("WorkTrackers as wt")
  .select([
    "wt.id",
    "wt.bleacher_uuid",
    "wt.date",
    "wt.status",
    "wt.pickup_time_mode",
    "wt.pickup_time_start",
    "wt.pickup_time_end",
    "wt.dropoff_time_mode",
    "wt.dropoff_time_start",
    "wt.dropoff_time_end",
    "wt.driver_uuid",
    "wt.dropoff_address_uuid",
    "wt.pre_inspection_uuid",
    "wt.post_inspection_uuid",
  ])
  .compile();

export function usePsWorkTrackers() {
  const { data } = useTypedQuery(compiled, expect<PsWorkTrackerRow>());
  return data ?? [];
}
