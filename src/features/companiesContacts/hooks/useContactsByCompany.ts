"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type Row = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export type CompanyContact = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

export function useContactsByCompany(companyUuid: string | null): CompanyContact[] {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Contacts")
        .select(["id", "first_name", "last_name", "email", "phone"])
        .where("company_uuid", "=", companyUuid ?? "")
        .where("deleted", "=", 0)
        .orderBy("first_name")
        .compile(),
    [companyUuid],
  );

  const { data } = useTypedQuery(compiled, expect<Row>());

  return useMemo(
    () =>
      companyUuid
        ? (data ?? []).map((c) => ({
            id: c.id,
            firstName: c.first_name ?? "",
            lastName: c.last_name,
            email: c.email,
            phone: c.phone,
          }))
        : [],
    [data, companyUuid],
  );
}
