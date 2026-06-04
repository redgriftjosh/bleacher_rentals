"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type CompanyRow = {
  id: string;
  company_name: string | null;
};

export type CompanyOption = {
  id: string;
  companyName: string;
};

export function useCompanies(): { companies: CompanyOption[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Companies")
        .select(["id", "company_name"])
        .where("deleted", "=", 0)
        .orderBy("company_name")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<CompanyRow>());

  const companies = useMemo(
    () =>
      (data ?? []).map((c) => ({
        id: c.id,
        companyName: c.company_name ?? "",
      })),
    [data],
  );

  return { companies, isLoading };
}
