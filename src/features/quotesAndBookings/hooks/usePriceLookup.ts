"use client";

import { useCallback, useMemo } from "react";
import { usePrices } from "./usePrices";
import { usePriceDurations } from "./usePriceDurations";

export function usePriceLookup() {
  const { prices, isLoading: pricesLoading } = usePrices();
  const { priceDurations, isLoading: durationsLoading } = usePriceDurations();

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of prices) {
      const key = `${p.bleacherTypeUuid}|${p.eventTypeUuid}|${p.priceDurationUuid}|${p.currency}`;
      map.set(key, p.priceCents);
    }
    return map;
  }, [prices]);

  const findDuration = useCallback(
    (startDate: string, endDate: string) => {
      if (!startDate || !endDate) return null;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const daysDiff = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

      return priceDurations.find((d) => daysDiff >= d.minDays && daysDiff <= d.maxDays) ?? null;
    },
    [priceDurations],
  );

  const lookupPrice = useCallback(
    (
      bleacherTypeUuid: string,
      eventTypeUuid: string,
      startDate: string,
      endDate: string,
      currency: string = "USD",
    ): number | null => {
      const duration = findDuration(startDate, endDate);
      if (!duration) return null;

      const key = `${bleacherTypeUuid}|${eventTypeUuid}|${duration.id}|${currency}`;
      return priceMap.get(key) ?? null;
    },
    [priceMap, findDuration],
  );

  return {
    lookupPrice,
    findDuration,
    isLoading: pricesLoading || durationsLoading,
  };
}
