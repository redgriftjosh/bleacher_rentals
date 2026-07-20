"use client";

import { useMemo } from "react";
import { DateTime } from "luxon";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

const compiled = db.selectFrom("WorkTrackers as wt").select(["wt.date as date"]).compile();

type WeekDateRow = { date: string | null };

/**
 * Reactive, local-first replacement for `fetchAllWorkTrackerWeeks`.
 * Returns the Monday (ISO date) of every week that has at least one work
 * tracker, sorted newest-first.
 */
export function useAllWorkTrackerWeeks(): { weeks: string[]; isLoading: boolean } {
  const { data, isLoading } = useTypedQuery(compiled, expect<WeekDateRow>());

  const weeks = useMemo(() => {
    const mondays = new Set<string>();
    for (const row of data ?? []) {
      if (!row.date) continue;
      const date = DateTime.fromISO(row.date);
      if (!date.isValid) continue;
      const monday = date.minus({ days: (date.weekday + 6) % 7 }).toISODate();
      if (monday) mondays.add(monday);
    }
    return Array.from(mondays).sort().reverse();
  }, [data]);

  return { weeks, isLoading };
}
