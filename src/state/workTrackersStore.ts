"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  workTrackers: Tables<"WorkTrackers">[];
  stale: boolean;
  setWorkTrackers: (data: Tables<"WorkTrackers">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useWorkTrackersStore = create<Store>((set) => ({
  workTrackers: [],
  stale: true,
  setWorkTrackers: (data) => set({ workTrackers: data }),
  setStale: (stale) => set({ stale: stale }),
}));
