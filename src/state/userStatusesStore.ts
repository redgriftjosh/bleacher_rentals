"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  userStatuses: Tables<"UserStatuses">[];
  stale: boolean;
  setUserStatuses: (data: Tables<"UserStatuses">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useUserStatusesStore = create<Store>((set) => ({
  userStatuses: [],
  stale: true,
  setUserStatuses: (data) => set({ userStatuses: data }),
  setStale: (stale) => set({ stale: stale }),
}));
