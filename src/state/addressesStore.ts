"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  addresses: Tables<"Addresses">[];
  stale: boolean;
  setAddresses: (data: Tables<"Addresses">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useAddressesStore = create<Store>((set) => ({
  addresses: [],
  stale: true,
  setAddresses: (data) => set({ addresses: data }),
  setStale: (stale) => set({ stale: stale }),
}));
