"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type DamageReportRow = {
  dr_uuid: string;
  bleacher_uuid: string | null;
  dr_inspection_uuid: string | null;
  dr_is_safe_to_sit: number | null;
  dr_is_safe_to_haul: number | null;
  dr_note: string | null;
  dr_created_at: string | null;
  dr_resolved_at: string | null;
  dr_maintenance_event_uuid: string | null;
  dr_wt_pre_date: string | null;
  dr_wt_post_date: string | null;
};

const compiled = db
  .selectFrom("DamageReports as dr")
  .leftJoin(
    "WorkTrackers as dr_wt_pre",
    "dr_wt_pre.pre_inspection_uuid",
    "dr.inspection_uuid",
  )
  .leftJoin(
    "WorkTrackers as dr_wt_post",
    "dr_wt_post.post_inspection_uuid",
    "dr.inspection_uuid",
  )
  .select([
    "dr.id as dr_uuid",
    "dr.bleacher_uuid",
    "dr.inspection_uuid as dr_inspection_uuid",
    "dr.is_safe_to_sit as dr_is_safe_to_sit",
    "dr.is_safe_to_haul as dr_is_safe_to_haul",
    "dr.note as dr_note",
    "dr.created_at as dr_created_at",
    "dr.resolved_at as dr_resolved_at",
    "dr.maintenance_event_uuid as dr_maintenance_event_uuid",
    "dr_wt_pre.date as dr_wt_pre_date",
    "dr_wt_post.date as dr_wt_post_date",
  ])
  .compile();

export function useDamageReportsTable() {
  return useTypedQuery(compiled, expect<DamageReportRow>());
}
