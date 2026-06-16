"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type BleacherTypeRow = {
  id: string;
  name: string | null;
  row_count: number | null;
  roof_type: string | null;
  created_at: string | null;
};

export function useBleacherTypesActive() {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("BleacherTypes")
        .select(["id", "name", "row_count", "roof_type", "created_at"])
        .where("deleted", "=", 0)
        .orderBy("row_count", "desc")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<BleacherTypeRow>());

  return {
    bleacherTypes: data ?? [],
    isLoading,
  };
}
