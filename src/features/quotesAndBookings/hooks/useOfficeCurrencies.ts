"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import type { Currency } from "../types/quoteTypes";
import { resolveOfficeCurrency } from "../utils/resolveOfficeCurrency";

/**
 * Every sales office's currency, by office id.
 *
 * This is the client-side half of the one currency rule: an office's currency is
 * whatever its QuickBooks connection reports, with the office province as a
 * fallback (`resolveOfficeCurrency` — the server resolves the same way in
 * `server/eventPaymentContext.ts`). Every screen that shows money for an event
 * arrives here, through `useEventCurrency` or directly.
 *
 * Deliberately narrow: it reads two columns per office, so a screen that needs
 * nothing but "which currency is this quote in" does not pull the whole sales
 * office list. `useSalesOffices` builds its richer rows on top of this.
 */
type OfficeCurrencyRow = {
  id: string;
  quickbook_uuid: string | null;
  address_state_province: string | null;
};

export function useOfficeCurrencies(): {
  currencyByOfficeId: ReadonlyMap<string, Currency>;
  isLoading: boolean;
} {
  const supabase = useClerkSupabaseClient();

  const compiled = useMemo(
    () =>
      db
        .selectFrom("SalesOffices as so")
        .leftJoin("Addresses as a", "so.address_uuid", "a.id")
        .select([
          "so.id as id",
          "so.quickbook_uuid as quickbook_uuid",
          "a.state_province as address_state_province",
        ])
        .where("so.deleted", "=", 0)
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<OfficeCurrencyRow>());

  // QboConnections aren't synced to PowerSync (tokens stay server-side), so the
  // currency each connection reports is fetched online instead.
  const [qboCurrencyById, setQboCurrencyById] = useState<Map<string, string | null>>(new Map());
  const [qboLoading, setQboLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("QboConnections")
      .select("id, currency")
      .then(({ data: rows, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch QBO connection currencies:", error);
        } else {
          setQboCurrencyById(new Map((rows ?? []).map((r) => [r.id, r.currency])));
        }
        setQboLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const currencyByOfficeId = useMemo(
    () =>
      new Map(
        (data ?? []).map((office) => [
          office.id,
          resolveOfficeCurrency(
            office.quickbook_uuid ? qboCurrencyById.get(office.quickbook_uuid) : null,
            office.address_state_province,
          ),
        ]),
      ),
    [data, qboCurrencyById],
  );

  // Both halves matter: until the QBO currencies land, every office still
  // resolves — on its province — so a caller that renders anyway is showing a
  // fallback, not a final answer.
  return { currencyByOfficeId, isLoading: isLoading || qboLoading };
}
