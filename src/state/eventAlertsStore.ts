"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  eventAlerts: Tables<"EventAlerts">[];
  stale: boolean;
  setEventAlerts: (data: Tables<"EventAlerts">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useEventAlertsStore = create<Store>((set) => ({
  eventAlerts: [],
  stale: true,
  setEventAlerts: (data) => set({ eventAlerts: data }),
  setStale: (stale) => set({ stale: stale }),
}));
