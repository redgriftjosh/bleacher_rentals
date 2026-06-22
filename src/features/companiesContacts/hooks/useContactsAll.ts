"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type ContactFull = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  companyUuid: string | null;
  companyName: string | null;
};

type Row = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  company_uuid: string | null;
  company_name: string | null;
};

export function useContactsAll(): { contacts: ContactFull[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Contacts as c")
        .leftJoin("Companies as co", "c.company_uuid", "co.id")
        .select([
          "c.id as id",
          "c.first_name as first_name",
          "c.last_name as last_name",
          "c.email as email",
          "c.phone as phone",
          "c.notes as notes",
          "c.company_uuid as company_uuid",
          "co.company_name as company_name",
        ])
        .where("c.deleted", "=", 0)
        .orderBy("c.first_name")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<Row>());

  const contacts = useMemo(
    () =>
      (data ?? []).map((c) => ({
        id: c.id,
        firstName: c.first_name ?? "",
        lastName: c.last_name,
        email: c.email,
        phone: c.phone,
        notes: c.notes,
        companyUuid: c.company_uuid,
        companyName: c.company_name,
      })),
    [data],
  );

  return { contacts, isLoading };
}
