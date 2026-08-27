"use client";

import { useCallback, useState } from "react";
import { QuotesBookingsFilters } from "../types";

const emptyFilters: QuotesBookingsFilters = {
  isOpen: false,
  statuses: [],
  createdFrom: null,
  createdTo: null,
  eventFrom: null,
  eventTo: null,
  bookedFrom: null,
  bookedTo: null,
  accountManagerUserUuid: null,
  inGoodShuffle: null,
};

export function useQuotesAndBookingsFilters(initialOverrides?: Partial<QuotesBookingsFilters>) {
  const [filters, setFilters] = useState<QuotesBookingsFilters>(() => {
    if (!initialOverrides) return emptyFilters;
    return { ...emptyFilters, ...initialOverrides, isOpen: true };
  });

  const toggleOpen = useCallback(() => {
    setFilters((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const setStatuses = useCallback((statuses: string[]) => {
    setFilters((prev) => ({ ...prev, statuses }));
  }, []);

  const setCreatedRange = useCallback((from: string | null, to: string | null) => {
    setFilters((prev) => ({ ...prev, createdFrom: from, createdTo: to }));
  }, []);

  const setEventRange = useCallback((from: string | null, to: string | null) => {
    setFilters((prev) => ({ ...prev, eventFrom: from, eventTo: to }));
  }, []);

  const setBookedRange = useCallback((from: string | null, to: string | null) => {
    setFilters((prev) => ({ ...prev, bookedFrom: from, bookedTo: to }));
  }, []);

  const setAccountManagerUserUuid = useCallback((uuid: string | null) => {
    setFilters((prev) => ({ ...prev, accountManagerUserUuid: uuid }));
  }, []);

  const setInGoodShuffle = useCallback((value: boolean | null) => {
    setFilters((prev) => ({ ...prev, inGoodShuffle: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      statuses: [],
      createdFrom: null,
      createdTo: null,
      eventFrom: null,
      eventTo: null,
      bookedFrom: null,
      bookedTo: null,
      accountManagerUserUuid: null,
      inGoodShuffle: null,
    }));
  }, []);

  return {
    filters,
    toggleOpen,
    setStatuses,
    setCreatedRange,
    setEventRange,
    setBookedRange,
    setAccountManagerUserUuid,
    setInGoodShuffle,
    clearFilters,
  };
}
