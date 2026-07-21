"use client";

import { useMemo } from "react";
import { DateTime } from "luxon";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type CrossBorderRow = {
  date: string | null;
  driver_street: string | null;
  dropoff_street: string | null;
};

function isCanadianDriver(street: string | null): boolean {
  if (!street) return false;
  const country = street.split(",").pop()?.trim();
  return country === "Canada";
}

function isUsaAddress(street: string | null): boolean {
  if (!street) return false;
  return /usa|united states/i.test(street);
}

/**
 * Reactive, local-first replacement for `fetchCrossBorderWeekStarts`.
 * Returns the set of week-start Mondays (ISO) that contain at least one
 * cross-border trip (Canadian driver dropping off at a USA address).
 */
export function useCrossBorderWeekStarts(start: string, end: string): Set<string> {
  const compiled = useMemo(() => {
    return db
      .selectFrom("WorkTrackers as wt")
      .leftJoin("Drivers as d", "d.id", "wt.driver_uuid")
      .leftJoin("Addresses as da", "da.id", "d.address_uuid")
      .leftJoin("Addresses as dropoff", "dropoff.id", "wt.dropoff_address_uuid")
      .select(["wt.date as date", "da.street as driver_street", "dropoff.street as dropoff_street"])
      .where("wt.date", ">=", start)
      .where("wt.date", "<", end)
      .compile();
  }, [start, end]);

  const { data } = useTypedQuery(compiled, expect<CrossBorderRow>());

  return useMemo(() => {
    const weekStarts = new Set<string>();
    for (const row of data ?? []) {
      if (!row.date) continue;
      if (!isCanadianDriver(row.driver_street)) continue;
      if (!isUsaAddress(row.dropoff_street)) continue;
      const date = DateTime.fromISO(row.date);
      if (!date.isValid) continue;
      const monday = date.minus({ days: (date.weekday + 6) % 7 }).toISODate();
      if (monday) weekStarts.add(monday);
    }
    return weekStarts;
  }, [data]);
}
