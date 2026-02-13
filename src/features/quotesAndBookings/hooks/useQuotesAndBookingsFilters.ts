"use client";

import { useCallback, useState } from "react";
import { QuotesBookingsFilters } from "../types";

const initialFilters: QuotesBookingsFilters = {
  isOpen: false,
  statuses: [],
  createdFrom: null,
  createdTo: null,
  eventFrom: null,
  eventTo: null,
  accountManagerUserUuid: null,
};

export function useQuotesAndBookingsFilters() {
  const [filters, setFilters] = useState<QuotesBookingsFilters>(initialFilters);

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

  const setAccountManagerUserUuid = useCallback((uuid: string | null) => {
    setFilters((prev) => ({ ...prev, accountManagerUserUuid: uuid }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      statuses: [],
      createdFrom: null,
      createdTo: null,
      eventFrom: null,
      eventTo: null,
      accountManagerUserUuid: null,
    }));
  }, []);

  return {
    filters,
    toggleOpen,
    setStatuses,
    setCreatedRange,
    setEventRange,
    setAccountManagerUserUuid,
    clearFilters,
  };
}
