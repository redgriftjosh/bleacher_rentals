"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsHomeBaseRow = {
  id: string;
  home_base_name: string | null;
};

const compiled = db
  .selectFrom("HomeBases as hb")
  .select(["hb.id", "hb.home_base_name"])
  .compile();

export function usePsHomeBases() {
  const { data } = useTypedQuery(compiled, expect<PsHomeBaseRow>());
  return data ?? [];
}
