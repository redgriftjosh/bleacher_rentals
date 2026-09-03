"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { Currency } from "../types/quoteTypes";
import { pickEventCurrency } from "../utils/eventCurrency";
import { useOfficeCurrencies } from "./useOfficeCurrencies";

/**
 * The currency one event is priced in.
 *
 * Read from the event's sales office, not from its line items: the office is
 * what the quote form asks for first, what the Stripe account hangs off, and
 * what the server charges in
 * (`server/eventPaymentContext.ts`). Line items only carry a copy of it.
 */
export function useEventCurrency(eventId: string | null): Currency {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Events")
        .select(["sales_office_uuid"])
        .where("id", "=", eventId ?? "")
        .limit(1)
        .compile(),
    [eventId],
  );

  const { data } = useTypedQuery(compiled, expect<{ sales_office_uuid: string | null }>());
  const { currencyByOfficeId } = useOfficeCurrencies();

  return pickEventCurrency(data?.[0]?.sales_office_uuid, currencyByOfficeId);
}
