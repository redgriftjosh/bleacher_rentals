"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  bleachers: any[];
  setBleachers: (data: any[]) => void;
};

export const useBleachersStore = create<Store>((set) => ({
  bleachers: [],
  setBleachers: (data) => set({ bleachers: data }),
}));
