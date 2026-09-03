"use client";

import { useMemo } from "react";
import type { Currency } from "../types/quoteTypes";
import { useSalesOffices } from "./useSalesOffices";

/**
 * Every sales office's currency, by office id — the lookup any screen showing
 * money for more than one event needs.
 *
 * Built on `useSalesOffices`, which already resolves each office's currency
 * from its QuickBooks connection (server-only, hence the online fetch there)
 * with the office province as a fallback. One resolution, one place.
 */
export function useOfficeCurrencies(): {
  currencyByOfficeId: ReadonlyMap<string, Currency>;
  isLoading: boolean;
} {
  const { salesOffices, isLoading } = useSalesOffices();

  const currencyByOfficeId = useMemo(
    () => new Map(salesOffices.map((office) => [office.id, office.currency])),
    [salesOffices],
  );

  return { currencyByOfficeId, isLoading };
}
