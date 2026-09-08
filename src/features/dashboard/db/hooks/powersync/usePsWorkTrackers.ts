"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsWorkTrackerRow = {
  id: string;
  bleacher_uuid: string | null;
  date: string | null;
  status: string | null;
  pickup_at: string | null;
  pickup_timezone: string | null;
  dropoff_at: string | null;
  dropoff_timezone: string | null;
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
    "wt.pickup_at",
    "wt.pickup_timezone",
    "wt.dropoff_at",
    "wt.dropoff_timezone",
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
