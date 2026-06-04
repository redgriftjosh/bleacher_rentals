"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type SalesOfficeRow = {
  id: string;
  name: string | null;
  quickbook_uuid: string | null;
  address_state_province: string | null;
};

export type SalesOfficeOption = {
  id: string;
  name: string;
  quickbookUuid: string | null;
  stateProvince: string | null;
};

const CANADIAN_PROVINCES = new Set([
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Nova Scotia", "Northwest Territories",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
]);

export function isCanadianProvince(stateProvince: string | null): boolean {
  if (!stateProvince) return false;
  return CANADIAN_PROVINCES.has(stateProvince);
}

export function useSalesOffices(): { salesOffices: SalesOfficeOption[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("SalesOffices as so")
        .leftJoin("Addresses as a", "so.address_uuid", "a.id")
        .select([
          "so.id as id",
          "so.name as name",
          "so.quickbook_uuid as quickbook_uuid",
          "a.state_province as address_state_province",
        ])
        .where("so.deleted", "=", 0)
        .orderBy("so.name")
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
        stateProvince: o.address_state_province,
      })),
    [data],
  );

  return { salesOffices, isLoading };
}
