"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsDamageReportRow = {
  id: string;
  bleacher_uuid: string | null;
  inspection_uuid: string | null;
  is_safe_to_sit: number | null;
  is_safe_to_haul: number | null;
  seat_damage: string | null;
  haul_damage: string | null;
  note: string | null;
  created_at: string | null;
  resolved_at: string | null;
  maintenance_event_uuid: string | null;
};

const compiled = db
  .selectFrom("DamageReports as dr")
  .select([
    "dr.id",
    "dr.bleacher_uuid",
    "dr.inspection_uuid",
    "dr.is_safe_to_sit",
    "dr.is_safe_to_haul",
    "dr.seat_damage",
    "dr.haul_damage",
    "dr.note",
    "dr.created_at",
    "dr.resolved_at",
    "dr.maintenance_event_uuid",
  ])
  .compile();

export function usePsDamageReports() {
  const { data } = useTypedQuery(compiled, expect<PsDamageReportRow>());
  return data ?? [];
}
