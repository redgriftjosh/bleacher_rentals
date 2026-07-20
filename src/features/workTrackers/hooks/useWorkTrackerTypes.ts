"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type WorkTrackerTypeOption = {
  id: string;
  display_name: string | null;
};

const compiled = db
  .selectFrom("WorkTrackerTypes as t")
  .select(["t.id as id", "t.display_name as display_name"])
  .where("t.is_deleted", "=", 0)
  .orderBy("t.sort_order", "asc")
  .compile();

/**
 * Reactive, local-first list of selectable work tracker types (non-deleted),
 * ordered by sort_order. Replaces the Supabase `WorkTrackerTypes` read.
 */
export function useWorkTrackerTypes(): {
  types: WorkTrackerTypeOption[];
  isLoading: boolean;
} {
  const { data, isLoading } = useTypedQuery(compiled, expect<WorkTrackerTypeOption>());
  return { types: data ?? [], isLoading };
}
