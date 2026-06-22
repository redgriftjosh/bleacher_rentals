"use client";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type PsDriverRow = {
  id: string;
  user_uuid: string | null;
};

const compiled = db
  .selectFrom("Drivers as d")
  .select(["d.id", "d.user_uuid"])
  .compile();

export function usePsDrivers() {
  const { data } = useTypedQuery(compiled, expect<PsDriverRow>());
  return data ?? [];
}
