"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type HomeBase = {
  id: string;
  created_at: string | null;
  home_base_name: string | null;
};

export function useHomeBases(): HomeBase[] {
  // Build the SQL with Kysely (type-safe tables/columns)
  const compiled = db
    .selectFrom("HomeBases")
    .select(["id", "home_base_name", "created_at"])
    .orderBy("home_base_name", "asc")
    .compile();

  const { data } = useTypedQuery(compiled, expect<HomeBase>());

  return data;
}
