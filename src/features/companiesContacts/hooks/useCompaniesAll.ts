"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type CompanyFull = {
  id: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type Row = {
  id: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export function useCompaniesAll(): { companies: CompanyFull[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Companies")
        .select(["id", "company_name", "email", "phone", "notes"])
        .where("deleted", "=", 0)
        .orderBy("company_name")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<Row>());

  const companies = useMemo(
    () =>
      (data ?? []).map((c) => ({
        id: c.id,
        companyName: c.company_name ?? "",
        email: c.email,
        phone: c.phone,
        notes: c.notes,
      })),
    [data],
  );

  return { companies, isLoading };
}
