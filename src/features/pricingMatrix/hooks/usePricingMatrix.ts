"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type PriceRow = {
  id: string;
  price_cents: number | null;
  currency: string | null;
  price_duration_uuid: string | null;
  event_type_uuid: string | null;
};

export function usePricesForType(bleacherTypeId: string) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Prices")
        .select(["id", "price_cents", "currency", "price_duration_uuid", "event_type_uuid"])
        .where("bleacher_type_uuid", "=", bleacherTypeId)
        .where("deleted", "=", 0)
        .compile(),
    [bleacherTypeId],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<PriceRow>());

  return { prices: data ?? [], isLoading };
}

type EventTypeRow = { id: string; name: string | null };
type PriceDurationRow = { id: string; name: string | null; min_days: number | null; max_days: number | null };

export function useEventTypesActive() {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventTypes")
        .select(["id", "name"])
        .where("deleted", "=", 0)
        .orderBy("name", "asc")
        .compile(),
    [],
  );
  const { data, isLoading } = useTypedQuery(compiled, expect<EventTypeRow>());
  return { eventTypes: data ?? [], isLoading };
}

export function usePriceDurationsActive() {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("PriceDurations")
        .select(["id", "name", "min_days", "max_days"])
        .where("deleted", "=", 0)
        .orderBy("min_days", "asc")
        .compile(),
    [],
  );
  const { data, isLoading } = useTypedQuery(compiled, expect<PriceDurationRow>());
  return { durations: data ?? [], isLoading };
}
