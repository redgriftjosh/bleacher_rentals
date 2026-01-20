"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";
import { updateCurrentEventAlerts } from "@/features/dashboard/functions";

type Store = {
  tasks: Tables<"Tasks">[];
  stale: boolean;
  setTasks: (data: Tables<"Tasks">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useTasksStore = create<Store>((set) => ({
  tasks: [],
  stale: true,
  setTasks: (data) => set({ tasks: data }),
  setStale: (stale) => set({ stale: stale }),
}));

useTasksStore.subscribe((state) => {
  updateCurrentEventAlerts();
});
