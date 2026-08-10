"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type WorkTrackerTypeOption = {
  id: string;
  display_name: string | null;
};

/**
 * Reactive, local-first list of selectable work tracker types (non-deleted),
 * ordered by sort_order. Replaces the Supabase `WorkTrackerTypes` read.
 */
export function useWorkTrackerTypes(): {
  types: WorkTrackerTypeOption[];
  isLoading: boolean;
} {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("WorkTrackerTypes as t")
        .select(["t.id as id", "t.display_name as display_name"])
        .where("t.is_deleted", "=", 0)
        .orderBy("t.sort_order", "asc")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<WorkTrackerTypeOption>());
  return { types: data ?? [], isLoading };
}
