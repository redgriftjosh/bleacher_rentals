"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type PriceDurationRow = {
  id: string;
  name: string | null;
  min_days: number | null;
  max_days: number | null;
};

export type PriceDurationOption = {
  id: string;
  name: string;
  minDays: number;
  maxDays: number;
};

export function usePriceDurations(): {
  priceDurations: PriceDurationOption[];
  isLoading: boolean;
} {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("PriceDurations")
        .select(["id", "name", "min_days", "max_days"])
        .where("deleted", "=", 0)
        .orderBy("min_days")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<PriceDurationRow>());

  const priceDurations = useMemo(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        name: r.name ?? "",
        minDays: r.min_days ?? 0,
        maxDays: r.max_days ?? 0,
      })),
    [data],
  );

  return { priceDurations, isLoading };
}
