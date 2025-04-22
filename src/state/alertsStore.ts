"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  alerts: Tables<"Alerts">[];
  stale: boolean;
  setAlerts: (data: Tables<"Alerts">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useAlertsStore = create<Store>((set) => ({
  alerts: [],
  stale: true,
  setAlerts: (data) => set({ alerts: data }),
  setStale: (stale) => set({ stale: stale }),
}));
