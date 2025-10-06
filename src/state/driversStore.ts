"use client";

import { create } from "zustand";
import { Tables } from "../../database.types";

// Store for Drivers table rows. Mirrors standard stale pattern used elsewhere.
// Each driver row corresponds to a record from the `Drivers` table
// If you need enriched user details join via Users store externally.

type Store = {
  drivers: Tables<"Drivers">[];
  stale: boolean;
  setDrivers: (data: Tables<"Drivers">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useDriversStore = create<Store>((set) => ({
  drivers: [],
  stale: true,
  setDrivers: (data) => set({ drivers: data }),
  setStale: (stale) => set({ stale }),
}));
