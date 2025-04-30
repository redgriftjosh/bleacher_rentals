"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  alertTypes: Tables<"AlertTypes">[];
  stale: boolean;
  setAlertTypes: (data: Tables<"AlertTypes">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useAlertTypesStore = create<Store>((set) => ({
  alertTypes: [],
  stale: true,
  setAlertTypes: (data) => set({ alertTypes: data }),
  setStale: (stale) => set({ stale: stale }),
}));
