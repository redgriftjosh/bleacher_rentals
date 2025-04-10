"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  bleachers: any[];
  stale: boolean;
  setBleachers: (data: any[]) => void;
  setStale: (stale: boolean) => void;
};

export const useBleachersStore = create<Store>((set) => ({
  bleachers: [],
  stale: true,
  setBleachers: (data) => set({ bleachers: data }),
  setStale: (stale) => set({ stale: stale }),
}));
