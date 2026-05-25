"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type MaintenanceEventRow = {
  bme_uuid: string;
  bleacher_uuid: string | null;
  maint_event_uuid: string;
  maint_event_name: string | null;
  maint_event_start: string | null;
  maint_event_end: string | null;
  maint_cost_cents: number | null;
  maint_address_street: string | null;
};

const compiled = db
  .selectFrom("BleacherMaintEvents as bme")
  .innerJoin("MaintenanceEvents as me", "me.id", "bme.maintenance_event_uuid")
  .leftJoin("Addresses as ma", "ma.id", "me.address_uuid")
  .select([
    "bme.id as bme_uuid",
    "bme.bleacher_uuid",
    "me.id as maint_event_uuid",
    "me.event_name as maint_event_name",
    "me.event_start as maint_event_start",
    "me.event_end as maint_event_end",
    "me.cost_cents as maint_cost_cents",
    "ma.street as maint_address_street",
  ])
  .compile();

export function useMaintenanceEventsTable() {
  return useTypedQuery(compiled, expect<MaintenanceEventRow>());
}
