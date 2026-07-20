"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsMaintenanceEventRow = {
  id: string;
  event_name: string | null;
  event_start: string | null;
  event_end: string | null;
  cost_cents: number | null;
  address_uuid: string | null;
};

const compiled = db
  .selectFrom("MaintenanceEvents as me")
  .select([
    "me.id",
    "me.event_name",
    "me.event_start",
    "me.event_end",
    "me.cost_cents",
    "me.address_uuid",
  ])
  .where("me.deleted", "=", 0)
  .compile();

export function usePsMaintenanceEvents() {
  const { data } = useTypedQuery(compiled, expect<PsMaintenanceEventRow>());
  return data ?? [];
}
