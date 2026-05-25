"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type EventBleacherRow = {
  event_uuid: string | null;
  bleacher_uuid: string | null;
};

const compiled = db
  .selectFrom("BleacherEvents as be")
  .select(["be.event_uuid", "be.bleacher_uuid"])
  .compile();

export function useEventBleachersTable() {
  return useTypedQuery(compiled, expect<EventBleacherRow>());
}
