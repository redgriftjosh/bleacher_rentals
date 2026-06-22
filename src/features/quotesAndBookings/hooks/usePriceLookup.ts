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
      if (!startDate || !endDate || priceDurations.length === 0) return null;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const daysDiff = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

      const exact = priceDurations.find((d) => daysDiff >= d.minDays && daysDiff <= d.maxDays);
      if (exact) return exact;

      // Fallback: if event is longer than all durations, use the longest available
      const longest = priceDurations[priceDurations.length - 1];
      if (daysDiff > longest.maxDays) return longest;

      return null;
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
      const exact = priceMap.get(key);
      if (exact !== undefined) return exact;

      // Fallback: find the longest duration that has a price for this combo
      // priceDurations is sorted by min_days asc, so iterate in reverse
      for (let i = priceDurations.length - 1; i >= 0; i--) {
        const fallbackKey = `${bleacherTypeUuid}|${eventTypeUuid}|${priceDurations[i].id}|${currency}`;
        const fallback = priceMap.get(fallbackKey);
        if (fallback !== undefined) return fallback;
      }

      return null;
    },
    [priceMap, findDuration, priceDurations],
  );

  return {
    lookupPrice,
    findDuration,
    isLoading: pricesLoading || durationsLoading,
  };
}
