"use client";

import { create } from "zustand";

export type WorkTrackerSelection = {
  work_tracker_id: number;
  bleacher_id: number;
  date: string;
} | null;

type Store = {
  selected: WorkTrackerSelection;
  setSelected: (wt: WorkTrackerSelection) => void;
  clear: () => void;
};

export const useWorkTrackerSelectionStore = create<Store>((set) => ({
  selected: null,
  setSelected: (wt) => set({ selected: wt }),
  clear: () => set({ selected: null }),
}));
