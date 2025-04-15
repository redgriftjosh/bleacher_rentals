"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  bleacherEvents: Tables<"BleacherEvents">[];
  stale: boolean;
  setBleacherEvents: (data: Tables<"BleacherEvents">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useBleacherEventsStore = create<Store>((set) => ({
  bleacherEvents: [],
  stale: true,
  setBleacherEvents: (data) => set({ bleacherEvents: data }),
  setStale: (stale) => set({ stale: stale }),
}));
