"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  bleachers: Tables<"Bleachers">[];
  stale: boolean;
  setBleachers: (data: Tables<"Bleachers">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useBleachersStore = create<Store>((set) => ({
  bleachers: [],
  stale: true,
  setBleachers: (data) => set({ bleachers: data }),
  setStale: (stale) => set({ stale: stale }),
}));
