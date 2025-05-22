"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  userHomeBases: Tables<"UserHomeBases">[];
  stale: boolean;
  setUserHomeBases: (data: Tables<"UserHomeBases">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useUserHomeBasesStore = create<Store>((set) => ({
  userHomeBases: [],
  stale: true,
  setUserHomeBases: (data) => set({ userHomeBases: data }),
  setStale: (stale) => set({ stale: stale }),
}));
