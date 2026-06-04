"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type PriceRow = {
  id: string;
  bleacher_type_uuid: string | null;
  event_type_uuid: string | null;
  price_duration_uuid: string | null;
  price_cents: number | null;
  currency: string | null;
};

export type PriceEntry = {
  id: string;
  bleacherTypeUuid: string;
  eventTypeUuid: string;
  priceDurationUuid: string;
  priceCents: number;
  currency: string;
};

export function usePrices(): { prices: PriceEntry[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("Prices")
        .select([
          "id",
          "bleacher_type_uuid",
          "event_type_uuid",
          "price_duration_uuid",
          "price_cents",
          "currency",
        ])
        .where("deleted", "=", 0)
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<PriceRow>());

  const prices = useMemo(
    () =>
      (data ?? [])
        .filter((r) => r.bleacher_type_uuid && r.event_type_uuid && r.price_duration_uuid)
        .map((r) => ({
          id: r.id,
          bleacherTypeUuid: r.bleacher_type_uuid!,
          eventTypeUuid: r.event_type_uuid!,
          priceDurationUuid: r.price_duration_uuid!,
          priceCents: r.price_cents ?? 0,
          currency: r.currency ?? "USD",
        })),
    [data],
  );

  return { prices, isLoading };
}
