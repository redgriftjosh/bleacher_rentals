"use client";

import { create } from "zustand";
import type { DashboardEvent } from "../types";

type DashboardEventsStore = {
  data: DashboardEvent[];
  stale: boolean;
  setData: (data: DashboardEvent[]) => void;
  setStale: (stale: boolean) => void;
};

export const useDashboardEventsStore = create<DashboardEventsStore>((set) => ({
  data: [],
  stale: true,
  setData: (data) => set({ data }),
  setStale: (stale) => set({ stale }),
}));
