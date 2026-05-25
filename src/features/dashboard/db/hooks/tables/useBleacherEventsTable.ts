"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type BleacherEventRow = {
  bleacher_event_uuid: string;
  bleacher_uuid: string | null;
  event_uuid: string;
  event_name: string | null;
  event_start: string | null;
  event_end: string | null;
  hsl_hue: number | null;
  booked: number | null;
  event_status: string | null;
  goodshuffle_url: string | null;
  address_street: string | null;
};

const compiled = db
  .selectFrom("BleacherEvents as be")
  .innerJoin("Events as e", "e.id", "be.event_uuid")
  .leftJoin("Addresses as a", "a.id", "e.address_uuid")
  .select([
    "be.id as bleacher_event_uuid",
    "be.bleacher_uuid",
    "e.id as event_uuid",
    "e.event_name",
    "e.event_start",
    "e.event_end",
    "e.hsl_hue",
    "e.booked",
    "e.event_status",
    "e.goodshuffle_url",
    "a.street as address_street",
  ])
  .compile();

export function useBleacherEventsTable() {
  return useTypedQuery(compiled, expect<BleacherEventRow>());
}
