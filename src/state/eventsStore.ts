"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  events: Tables<"Events">[];
  stale: boolean;
  setEvents: (data: Tables<"Events">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useEventsStore = create<Store>((set) => ({
  events: [],
  stale: true,
  setEvents: (data) => set({ events: data }),
  setStale: (stale) => set({ stale: stale }),
}));
