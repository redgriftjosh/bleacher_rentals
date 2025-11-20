"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  userRolesJunction: Tables<"UserRolesJunction">[];
  stale: boolean;
  setUserRolesJunction: (data: Tables<"UserRolesJunction">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useUserRolesJunctionStore = create<Store>((set) => ({
  userRolesJunction: [],
  stale: true,
  setUserRolesJunction: (data) => set({ userRolesJunction: data }),
  setStale: (stale) => set({ stale: stale }),
}));
