"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsBleacherMaintEventRow = {
  id: string;
  bleacher_uuid: string | null;
  maintenance_event_uuid: string | null;
};

const compiled = db
  .selectFrom("BleacherMaintEvents as bme")
  .select(["bme.id", "bme.bleacher_uuid", "bme.maintenance_event_uuid"])
  .compile();

export function usePsBleacherMaintEvents() {
  const { data } = useTypedQuery(compiled, expect<PsBleacherMaintEventRow>());
  return data ?? [];
}
