"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsBleacherEventRow = {
  id: string;
  bleacher_uuid: string | null;
  event_uuid: string | null;
  setup_text: string | null;
  setup_confirmed: number | null;
  teardown_text: string | null;
  teardown_confirmed: number | null;
};

const compiled = db
  .selectFrom("BleacherEvents as be")
  .select([
    "be.id",
    "be.bleacher_uuid",
    "be.event_uuid",
    "be.setup_text",
    "be.setup_confirmed",
    "be.teardown_text",
    "be.teardown_confirmed",
  ])
  .compile();

export function usePsBleacherEvents() {
  const { data } = useTypedQuery(compiled, expect<PsBleacherEventRow>());
  return data ?? [];
}
