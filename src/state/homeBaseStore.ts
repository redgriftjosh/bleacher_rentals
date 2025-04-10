"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  homeBases: any[];
  stale: boolean;
  setHomeBases: (data: any[]) => void;
  setStale: (stale: boolean) => void;
};

export const useHomeBasesStore = create<Store>((set) => ({
  homeBases: [],
  stale: true,
  setHomeBases: (data) => set({ homeBases: data }),
  setStale: (stale) => set({ stale: stale }),
}));
