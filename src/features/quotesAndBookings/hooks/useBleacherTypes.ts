"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type BleacherTypeRow = {
  id: string;
  name: string | null;
  row_count: number | null;
};

export type BleacherTypeOption = {
  id: string;
  name: string;
  rowCount: number;
};

export function useBleacherTypes(): { bleacherTypes: BleacherTypeOption[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("BleacherTypes")
        .select(["id", "name", "row_count"])
        .where("deleted", "=", 0)
        .orderBy("row_count")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<BleacherTypeRow>());

  const bleacherTypes = useMemo(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        name: r.name ?? "",
        rowCount: r.row_count ?? 0,
      })),
    [data],
  );

  return { bleacherTypes, isLoading };
}
