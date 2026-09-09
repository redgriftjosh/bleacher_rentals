"use client";

import { useMemo } from "react";
import { sql } from "kysely";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { filterWorkTrackers } from "../utils/filterWorkTrackers";
import { WorkTrackerRow, WorkTrackerFilters } from "../types";
import { useTimezoneStore } from "@/lib/useTimezoneStore";

const compiled = db
  .selectFrom("WorkTrackers as wt")
  .leftJoin("Drivers as d", "wt.driver_uuid", "d.id")
  .leftJoin("Users as u", "d.user_uuid", "u.id")
  .leftJoin("AccountManagers as am", "d.account_manager_uuid", "am.id")
  .leftJoin("Users as amu", "am.user_uuid", "amu.id")
  .leftJoin("Bleachers as b", "wt.bleacher_uuid", "b.id")
  .leftJoin("Addresses as pa", "wt.pickup_address_uuid", "pa.id")
  .leftJoin("Addresses as da", "wt.dropoff_address_uuid", "da.id")
  .select([
    "wt.id as id",
    "wt.date as date",
    "wt.status as status",
    "wt.pay_cents as pay_cents",
    "wt.created_at as created_at",
    "wt.completed_at as completed_at",
    "wt.project_number as project_number",
    "wt.driver_uuid as driver_uuid",
    "d.account_manager_uuid as driver_account_manager_uuid",
    "amu.first_name as account_manager_first_name",
    "amu.last_name as account_manager_last_name",
    "u.first_name as driver_first_name",
    "u.last_name as driver_last_name",
    "u.email as driver_email",
    "b.bleacher_number as bleacher_number",
    "pa.street as pickup_street",
    "pa.city as pickup_city",
    "pa.state_province as pickup_state",
    "da.street as dropoff_street",
    "da.city as dropoff_city",
    "da.state_province as dropoff_state",
  ])
  .orderBy("wt.date", "desc")
  // Same-day trackers by pickup time, matching the driver trip list. Any Time
  // (null) trackers sort last within their date.
  .orderBy(sql<string>`wt.pickup_time_start is null`, "asc")
  .orderBy("wt.pickup_time_start", "asc")
  .compile();

export function useAllWorkTrackersData(filters: WorkTrackerFilters) {
  const timezone = useTimezoneStore((s) => s.timezone);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<WorkTrackerRow>());

  const filtered = useMemo(() => {
    if (!data) return data;
    return filterWorkTrackers(data, filters, timezone);
  }, [data, filters, timezone]);

  return { data: filtered, isLoading, error };
}
