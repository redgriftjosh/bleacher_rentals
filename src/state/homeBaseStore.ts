"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  homeBases: Tables<"HomeBases">[];
  stale: boolean;
  setHomeBases: (data: Tables<"HomeBases">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useHomeBasesStore = create<Store>((set) => ({
  homeBases: [],
  stale: true,
  setHomeBases: (data) => set({ homeBases: data }),
  setStale: (stale) => set({ stale: stale }),
}));
