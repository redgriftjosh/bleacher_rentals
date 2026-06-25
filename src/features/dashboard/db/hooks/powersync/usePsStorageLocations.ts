"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsStorageLocationRow = {
  id: string;
  name: string | null;
};

const compiled = db
  .selectFrom("StorageLocations as sl")
  .select(["sl.id", "sl.name"])
  .where("sl.deleted", "=", 0)
  .compile();

export function usePsStorageLocations() {
  const { data } = useTypedQuery(compiled, expect<PsStorageLocationRow>());
  return data ?? [];
}
