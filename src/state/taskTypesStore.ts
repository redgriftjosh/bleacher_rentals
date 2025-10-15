"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";
import { updateCurrentEventAlerts } from "@/features/oldDashboard/functions";

type Store = {
  taskTypes: Tables<"TaskTypes">[];
  stale: boolean;
  setTaskTypes: (data: Tables<"TaskTypes">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useTaskTypesStore = create<Store>((set) => ({
  taskTypes: [],
  stale: true,
  setTaskTypes: (data) => set({ taskTypes: data }),
  setStale: (stale) => set({ stale: stale }),
}));

useTaskTypesStore.subscribe((state) => {
  updateCurrentEventAlerts();
});
