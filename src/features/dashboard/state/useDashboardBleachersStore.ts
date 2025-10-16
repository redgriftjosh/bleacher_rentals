"use client";

import { create } from "zustand";
import type { Bleacher } from "../types";

type DashboardBleachersStore = {
  data: Bleacher[];
  stale: boolean;
  setData: (data: Bleacher[]) => void;
  setStale: (stale: boolean) => void;
};

export const useDashboardBleachersStore = create<DashboardBleachersStore>((set) => ({
  data: [],
  stale: true,
  setData: (data) => set({ data }),
  setStale: (stale) => set({ stale }),
}));

// subscribe to this store and log to console the new values
useDashboardBleachersStore.subscribe((state) => {
  console.log("DashboardBleachersStore updated:", state);
});
