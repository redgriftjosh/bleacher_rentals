"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  homeBases: any[];
  setHomeBases: (data: any[]) => void;
};

export const useHomeBasesStore = create<Store>((set) => ({
  homeBases: [],
  setHomeBases: (data) => set({ homeBases: data }),
}));
