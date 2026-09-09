"use client";

import { useMemo } from "react";
import { DateTime } from "luxon";
import { sql } from "kysely";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery, type CompiledResultOf } from "@/lib/powersync/typedQuery";
import type { Tables } from "../../../../database.types";
import type { WorkTrackersResult } from "../db/db";

type DriverRow = {
  driver_uuid: string;
  taxDec: number | null;
  address_id: string | null;
  address_created_at: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state_province: string | null;
  address_zip_postal: string | null;
};

const NONE = "__no_driver__";

/**
 * Reactive, local-first replacement for
 * `fetchWorkTrackersForUserUuidAndStartDate` (client paths only).
 */
export function useWorkTrackersForWeek(
  userUuid: string,
  startDate: string,
): { data: WorkTrackersResult | undefined; isLoading: boolean; error: unknown } {
  const driverCompiled = useMemo(() => {
    return db
      .selectFrom("Drivers as d")
      .leftJoin("Addresses as a", "a.id", "d.address_uuid")
      .select([
        "d.id as driver_uuid",
        "d.tax_dec as taxDec",
        "a.id as address_id",
        "a.created_at as address_created_at",
        "a.street as address_street",
        "a.city as address_city",
        "a.state_province as address_state_province",
        "a.zip_postal as address_zip_postal",
      ])
      .where("d.user_uuid", "=", userUuid)
      .limit(1)
      .compile();
  }, [userUuid]);

  const {
    data: driverData,
    isLoading: driverLoading,
    error: driverError,
  } = useTypedQuery(driverCompiled, expect<DriverRow>());

  const driver = driverData?.[0];
  const driverUuid = driver?.driver_uuid ?? NONE;

  const trackersCompiled = useMemo(() => {
    const endDate = DateTime.fromISO(startDate).plus({ days: 7 }).toISODate() ?? startDate;
    return (
      db
        .selectFrom("WorkTrackers as wt")
        .leftJoin("Bleachers as b", "b.id", "wt.bleacher_uuid")
        .leftJoin("WorkTrackerTypes as t", "t.id", "wt.work_tracker_type_uuid")
        .leftJoin("Addresses as pu", "pu.id", "wt.pickup_address_uuid")
        .leftJoin("Addresses as dof", "dof.id", "wt.dropoff_address_uuid")
        .selectAll("wt")
        .select([
          "b.bleacher_number as bleacher_number",
          "t.display_name as activity_type",
          "pu.id as pickup_id",
          "pu.created_at as pickup_created_at",
          "pu.street as pickup_street",
          "pu.city as pickup_city",
          "pu.state_province as pickup_state_province",
          "pu.zip_postal as pickup_zip_postal",
          "dof.id as dropoff_id",
          "dof.created_at as dropoff_created_at",
          "dof.street as dropoff_street",
          "dof.city as dropoff_city",
          "dof.state_province as dropoff_state_province",
          "dof.zip_postal as dropoff_zip_postal",
        ])
        .where("wt.driver_uuid", "=", driverUuid)
        .where("wt.date", ">=", startDate)
        .where("wt.date", "<", endDate)
        .orderBy("wt.date", "asc")
        // Same-day trackers sort by pickup time (plain "HH:MM:SS" text, no
        // date/timezone to complicate the comparison). Any Time (null) trackers
        // sort last within their date — nulls first would push every unset
        // pickup above every timed one, which reads as wrong for a driver's list.
        .orderBy(sql<string>`wt.pickup_time_start is null`, "asc")
        .orderBy("wt.pickup_time_start", "asc")
        .compile()
    );
  }, [driverUuid, startDate]);

  const {
    data: trackerRows,
    isLoading: trackersLoading,
    error: trackersError,
  } = useTypedQuery(trackersCompiled, expect<CompiledResultOf<typeof trackersCompiled>>());

  const data = useMemo<WorkTrackersResult | undefined>(() => {
    if (!driver) return undefined;

    const driverAddress: Tables<"Addresses"> | null = driver.address_id
      ? ({
          id: driver.address_id,
          created_at: driver.address_created_at,
          street: driver.address_street,
          city: driver.address_city,
          state_province: driver.address_state_province,
          zip_postal: driver.address_zip_postal,
        } as unknown as Tables<"Addresses">)
      : null;

    const workTrackers = (trackerRows ?? []).map((row) => ({
      workTracker: row as unknown as Tables<"WorkTrackers">,
      bleacherNumber: row.bleacher_number,
      activityType: row.activity_type,
      pickup_address: row.pickup_id
        ? ({
            id: row.pickup_id,
            created_at: row.pickup_created_at,
            street: row.pickup_street,
            city: row.pickup_city,
            state_province: row.pickup_state_province,
            zip_postal: row.pickup_zip_postal,
          } as unknown as Tables<"Addresses">)
        : null,
      dropoff_address: row.dropoff_id
        ? ({
            id: row.dropoff_id,
            created_at: row.dropoff_created_at,
            street: row.dropoff_street,
            city: row.dropoff_city,
            state_province: row.dropoff_state_province,
            zip_postal: row.dropoff_zip_postal,
          } as unknown as Tables<"Addresses">)
        : null,
    }));

    return { workTrackers, driverTax: driver.taxDec ?? 0, driverAddress };
  }, [driver, trackerRows]);

  return {
    data,
    isLoading: driverLoading || trackersLoading,
    error: driverError ?? trackersError,
  };
}
