"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsZoneRow = {
  id: string;
  display_name: string | null;
};

const compiled = db.selectFrom("Zones as z").select(["z.id", "z.display_name"]).compile();

export function usePsZones() {
  const { data } = useTypedQuery(compiled, expect<PsZoneRow>());
  return data ?? [];
}
