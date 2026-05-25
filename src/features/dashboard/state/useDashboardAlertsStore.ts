"use client";

import { create } from "zustand";
import type { AlertRow } from "../db/hooks/tables/useAlertsTable";

type Store = {
  alerts: AlertRow[];
  stale: boolean;
  setData: (data: AlertRow[]) => void;
  setStale: (stale: boolean) => void;
};

export const useDashboardAlertsStore = create<Store>((set) => ({
  alerts: [],
  stale: true,
  setData: (data) => set({ alerts: data }),
  setStale: (stale) => set({ stale }),
}));
