"use client";

import { useMemo } from "react";
import { DateTime } from "luxon";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { isCanadianAddress, isUsaAddress } from "../util/addressCountry";

type CrossBorderRow = {
  date: string | null;
  driver_street: string | null;
  driver_country: string | null;
  dropoff_street: string | null;
  dropoff_country: string | null;
};

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
      .select([
        "wt.date as date",
        "da.street as driver_street",
        "da.country as driver_country",
        "dropoff.street as dropoff_street",
        "dropoff.country as dropoff_country",
      ])
      .where("wt.date", ">=", start)
      .where("wt.date", "<", end)
      .compile();
  }, [start, end]);

  const { data } = useTypedQuery(compiled, expect<CrossBorderRow>());

  return useMemo(() => {
    const weekStarts = new Set<string>();
    for (const row of data ?? []) {
      if (!row.date) continue;
      if (!isCanadianAddress(row.driver_country, row.driver_street)) continue;
      if (!isUsaAddress(row.dropoff_country, row.dropoff_street)) continue;
      const date = DateTime.fromISO(row.date);
      if (!date.isValid) continue;
      const monday = date.minus({ days: (date.weekday + 6) % 7 }).toISODate();
      if (monday) weekStarts.add(monday);
    }
    return weekStarts;
  }, [data]);
}
