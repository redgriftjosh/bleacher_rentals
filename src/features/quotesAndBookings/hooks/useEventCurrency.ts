"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { Currency } from "../types/quoteTypes";

export function useEventCurrency(eventId: string | null): Currency {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventLineItems")
        .select(["currency"])
        .where("event_uuid", "=", eventId ?? "")
        .where("deleted", "=", 0)
        .limit(1)
        .compile(),
    [eventId],
  );

  const { data } = useTypedQuery(compiled, expect<{ currency: string | null }>());
  const raw = data?.[0]?.currency;
  return raw === "CAD" ? "CAD" : "USD";
}
