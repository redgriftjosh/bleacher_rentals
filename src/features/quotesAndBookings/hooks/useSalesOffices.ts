"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import type { Currency } from "../types/quoteTypes";
import { pickEventCurrency } from "../utils/eventCurrency";
import { useOfficeCurrencies } from "./useOfficeCurrencies";

// Re-exported for the existing callers that import them from here.
export { isCanadianProvince } from "../utils/canadianTaxRates";
export { resolveOfficeCurrency } from "../utils/resolveOfficeCurrency";

export type SalesOfficeRow = {
  id: string;
  name: string | null;
  quickbook_uuid: string | null;
  stripe_connection_uuid: string | null;
  address_state_province: string | null;
};

export type SalesOfficeOption = {
  id: string;
  name: string;
  quickbookUuid: string | null;
  stripeConnectionUuid: string | null;
  stateProvince: string | null;
  /** Inherited from the office's QuickBooks connection. */
  currency: Currency;
};

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
          "so.stripe_connection_uuid as stripe_connection_uuid",
          "a.state_province as address_state_province",
        ])
        .where("so.deleted", "=", 0)
        .orderBy("so.name")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<SalesOfficeRow>());

  // One resolution for the whole app — see useOfficeCurrencies.
  const { currencyByOfficeId } = useOfficeCurrencies();

  const salesOffices = useMemo(
    () =>
      (data ?? []).map((o) => ({
        id: o.id,
        name: o.name ?? "",
        quickbookUuid: o.quickbook_uuid,
        stripeConnectionUuid: o.stripe_connection_uuid,
        stateProvince: o.address_state_province,
        currency: pickEventCurrency(o.id, currencyByOfficeId),
      })),
    [data, currencyByOfficeId],
  );

  return { salesOffices, isLoading };
}
