"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";
import { updateCurrentEventAlerts } from "@/features/dashboard/functions";

type Store = {
  taskStatuses: Tables<"TaskStatuses">[];
  stale: boolean;
  setTaskStatuses: (data: Tables<"TaskStatuses">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useTaskStatusesStore = create<Store>((set) => ({
  taskStatuses: [],
  stale: true,
  setTaskStatuses: (data) => set({ taskStatuses: data }),
  setStale: (stale) => set({ stale: stale }),
}));

useTaskStatusesStore.subscribe((state) => {
  updateCurrentEventAlerts();
});
