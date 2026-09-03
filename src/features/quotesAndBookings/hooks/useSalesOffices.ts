"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import type { Currency } from "../types/quoteTypes";
import { resolveOfficeCurrency } from "./resolveOfficeCurrency";

// Re-exported for the existing callers that import them from here.
export { isCanadianProvince } from "../utils/canadianTaxRates";
export { resolveOfficeCurrency } from "./resolveOfficeCurrency";

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
  const supabase = useClerkSupabaseClient();

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

  // QboConnections aren't synced to PowerSync (tokens stay server-side), so the
  // currency each connection reports is fetched online instead.
  const [qboCurrencyById, setQboCurrencyById] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("QboConnections")
      .select("id, currency")
      .then(({ data: rows, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch QBO connection currencies:", error);
          return;
        }
        setQboCurrencyById(new Map((rows ?? []).map((r) => [r.id, r.currency])));
      });

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const salesOffices = useMemo(
    () =>
      (data ?? []).map((o) => ({
        id: o.id,
        name: o.name ?? "",
        quickbookUuid: o.quickbook_uuid,
        stripeConnectionUuid: o.stripe_connection_uuid,
        stateProvince: o.address_state_province,
        currency: resolveOfficeCurrency(
          o.quickbook_uuid ? qboCurrencyById.get(o.quickbook_uuid) : null,
          o.address_state_province,
        ),
      })),
    [data, qboCurrencyById],
  );

  return { salesOffices, isLoading };
}
