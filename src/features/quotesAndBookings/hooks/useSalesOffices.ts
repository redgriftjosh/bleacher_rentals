"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type SalesOfficeRow = {
  id: string;
  name: string | null;
  quickbook_uuid: string | null;
};

export type SalesOfficeOption = {
  id: string;
  name: string;
  quickbookUuid: string | null;
};

export function useSalesOffices(): { salesOffices: SalesOfficeOption[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("SalesOffices")
        .select(["id", "name", "quickbook_uuid"])
        .where("deleted", "=", 0)
        .orderBy("name")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<SalesOfficeRow>());

  const salesOffices = useMemo(
    () =>
      (data ?? []).map((o) => ({
        id: o.id,
        name: o.name ?? "",
        quickbookUuid: o.quickbook_uuid,
      })),
    [data],
  );

  return { salesOffices, isLoading };
}
