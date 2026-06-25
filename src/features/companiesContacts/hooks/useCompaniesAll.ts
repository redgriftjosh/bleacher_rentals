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
  /** Flattened billing address, for search matching. */
  address: string;
};

type Row = {
  id: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  street: string | null;
  city: string | null;
  state_province: string | null;
  zip_postal: string | null;
};

export function useCompaniesAll(): { companies: CompanyFull[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Companies as c")
        .leftJoin("Addresses as a", "a.id", "c.billing_address_uuid")
        .select([
          "c.id as id",
          "c.company_name as company_name",
          "c.email as email",
          "c.phone as phone",
          "c.notes as notes",
          "a.street as street",
          "a.city as city",
          "a.state_province as state_province",
          "a.zip_postal as zip_postal",
        ])
        .where("c.deleted", "=", 0)
        .orderBy("c.company_name")
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
        address: [c.street, c.city, c.state_province, c.zip_postal].filter(Boolean).join(" "),
      })),
    [data],
  );

  return { companies, isLoading };
}
