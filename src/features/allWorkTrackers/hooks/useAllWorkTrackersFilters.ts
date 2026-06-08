"use client";

import { useCallback, useState } from "react";
import { WorkTrackerFilters } from "../types";

const initialFilters: WorkTrackerFilters = {
  isOpen: false,
  statuses: [],
  dateFrom: null,
  dateTo: null,
  completedFrom: null,
  completedTo: null,
  driverUuid: null,
  accountManagerUuid: null,
};

export function useAllWorkTrackersFilters(initialOverrides?: Partial<WorkTrackerFilters>) {
  const [filters, setFilters] = useState<WorkTrackerFilters>(() => {
    if (!initialOverrides) return initialFilters;
    return { ...initialFilters, isOpen: true, ...initialOverrides };
  });

  const toggleOpen = useCallback(() => {
    setFilters((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const setStatuses = useCallback((statuses: string[]) => {
    setFilters((prev) => ({ ...prev, statuses }));
  }, []);

  const setDateRange = useCallback((from: string | null, to: string | null) => {
    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
  }, []);

  const setCompletedRange = useCallback((from: string | null, to: string | null) => {
    setFilters((prev) => ({ ...prev, completedFrom: from, completedTo: to }));
  }, []);

  const setDriverUuid = useCallback((uuid: string | null) => {
    setFilters((prev) => ({ ...prev, driverUuid: uuid }));
  }, []);

  const setAccountManagerUuid = useCallback((uuid: string | null) => {
    setFilters((prev) => ({ ...prev, accountManagerUuid: uuid }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      statuses: [],
      dateFrom: null,
      dateTo: null,
      completedFrom: null,
      completedTo: null,
      driverUuid: null,
      accountManagerUuid: null,
    }));
  }, []);

  return {
    filters,
    toggleOpen,
    setStatuses,
    setDateRange,
    setCompletedRange,
    setDriverUuid,
    setAccountManagerUuid,
    clearFilters,
  };
}
