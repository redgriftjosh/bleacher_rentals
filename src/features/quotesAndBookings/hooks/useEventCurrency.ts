"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { Currency } from "../types/quoteTypes";
import { pickEventCurrency } from "../utils/eventCurrency";
import { useOfficeCurrencies } from "./useOfficeCurrencies";

export type EventCurrencyState = {
  currency: Currency;
  /**
   * Whether `currency` is the office's actual answer rather than the fallback.
   *
   * Both halves have to have landed: the event's own row, and the office
   * currency map — whose QBO half is an **online** fetch, because QboConnections
   * is not synced to PowerSync. So this can be false for a while on a slow
   * connection, and stays false offline for an office whose province does not
   * imply its currency.
   */
  isResolved: boolean;
};

/**
 * The currency one event is priced in, with the question of whether we know it
 * yet kept separate from the answer.
 *
 * Read from the event's sales office, not from its line items: the office is
 * what the quote form asks for first, what the Stripe account hangs off, and
 * what the server charges in
 * (`server/eventPaymentContext.ts`). Line items only carry a copy of it.
 *
 * **Anything that writes the currency must read `isResolved`.** Displaying the
 * fallback for a moment is harmless — every screen has always done it. Writing
 * it is not: a payment row in the wrong currency is excluded from every total,
 * raises the foreign-currency banner, and cannot be edited or deleted
 * (manual-payment-entry.md §3.5, E5). `useEventCurrency` below is the display
 * half, and deliberately cannot tell you the difference.
 */
export function useEventCurrencyState(eventId: string | null): EventCurrencyState {
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

  const { data, isLoading } = useTypedQuery(
    compiled,
    expect<{ sales_office_uuid: string | null }>(),
  );
  const { currencyByOfficeId, isLoading: currenciesLoading } = useOfficeCurrencies();

  return {
    currency: pickEventCurrency(data?.[0]?.sales_office_uuid, currencyByOfficeId),
    isResolved: eventId !== null && !isLoading && !currenciesLoading,
  };
}

/** The display half: the currency, with no way to ask whether it is final. */
export function useEventCurrency(eventId: string | null): Currency {
  return useEventCurrencyState(eventId).currency;
}
