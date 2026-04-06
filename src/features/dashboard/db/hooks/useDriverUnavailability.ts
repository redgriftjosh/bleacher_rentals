"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

type UnavailRow = {
  driverUuid: string | null;
  dateUnavailable: string | null;
};

/**
 * Returns a Set of "driverUuid:date" keys for all driver unavailability records.
 * Components can check `set.has(\`${driverUuid}:${date}\`)` for O(1) lookups.
 */
export function useDriverUnavailability() {
  const compiled = db
    .selectFrom("DriverUnavailability as du")
    .select(["du.driver_uuid as driverUuid", "du.date_unavailable as dateUnavailable"])
    .compile();

  const { data } = useTypedQuery(compiled, expect<UnavailRow>());

  return useMemo(() => {
    const set = new Set<string>();
    for (const row of data ?? []) {
      if (row.driverUuid && row.dateUnavailable) {
        set.add(`${row.driverUuid}:${row.dateUnavailable}`);
      }
    }
    return set;
  }, [data]);
}
