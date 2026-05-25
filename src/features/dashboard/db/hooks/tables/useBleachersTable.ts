"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type BleacherRow = {
  bleacher_uuid: string;
  bleacher_number: number | null;
  bleacher_rows: number | null;
  bleacher_seats: number | null;
  linxup_device_id: string | null;
  summer_account_manager_uuid: string | null;
  winter_account_manager_uuid: string | null;
  summer_home_base_uuid: string | null;
  summer_home_base_name: string | null;
  winter_home_base_uuid: string | null;
  winter_home_base_name: string | null;
};

const compiled = db
  .selectFrom("Bleachers as b")
  .leftJoin("HomeBases as summer_hb", "summer_hb.id", "b.summer_home_base_uuid")
  .leftJoin("HomeBases as winter_hb", "winter_hb.id", "b.winter_home_base_uuid")
  .where("b.deleted", "=", 0)
  .select([
    "b.id as bleacher_uuid",
    "b.bleacher_number",
    "b.bleacher_rows",
    "b.bleacher_seats",
    "b.linxup_device_id",
    "b.summer_account_manager_uuid",
    "b.winter_account_manager_uuid",
    "summer_hb.id as summer_home_base_uuid",
    "summer_hb.home_base_name as summer_home_base_name",
    "winter_hb.id as winter_home_base_uuid",
    "winter_hb.home_base_name as winter_home_base_name",
  ])
  .orderBy("b.bleacher_number", "asc")
  .compile();

export function useBleachersTable() {
  return useTypedQuery(compiled, expect<BleacherRow>());
}
