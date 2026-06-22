"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsBleacherRow = {
  id: string;
  bleacher_number: number | null;
  bleacher_rows: number | null;
  bleacher_seats: number | null;
  linxup_device_id: string | null;
  summer_account_manager_uuid: string | null;
  winter_account_manager_uuid: string | null;
  summer_home_base_uuid: string | null;
  winter_home_base_uuid: string | null;
  zone_uuid: string | null;
};

const compiled = db
  .selectFrom("Bleachers as b")
  .select([
    "b.id",
    "b.bleacher_number",
    "b.bleacher_rows",
    "b.bleacher_seats",
    "b.linxup_device_id",
    "b.summer_account_manager_uuid",
    "b.winter_account_manager_uuid",
    "b.summer_home_base_uuid",
    "b.winter_home_base_uuid",
    "b.zone_uuid",
  ])
  .where("b.deleted", "=", 0)
  .orderBy("b.bleacher_number", "asc")
  .compile();

export function usePsBleachers() {
  const { data } = useTypedQuery(compiled, expect<PsBleacherRow>());
  return data ?? [];
}
