"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsSubrentalEventRow = {
  id: string;
  event_start: string | null;
  event_end: string | null;
  notes: string | null;
  status: string | null;
  requested_zone_uuid: string | null;
  bleacher_uuid: string | null;
  created_by_user_uuid: string | null;
};

const compiled = db
  .selectFrom("SubrentalEvents as sr")
  .select([
    "sr.id",
    "sr.event_start",
    "sr.event_end",
    "sr.notes",
    "sr.status",
    "sr.requested_zone_uuid",
    "sr.bleacher_uuid",
    "sr.created_by_user_uuid",
  ])
  .compile();

export function usePsSubrentalEvents() {
  const { data } = useTypedQuery(compiled, expect<PsSubrentalEventRow>());
  return data ?? [];
}
