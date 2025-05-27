"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  userRoles: Tables<"UserRoles">[];
  stale: boolean;
  setUserRoles: (data: Tables<"UserRoles">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useUserRolesStore = create<Store>((set) => ({
  userRoles: [],
  stale: true,
  setUserRoles: (data) => set({ userRoles: data }),
  setStale: (stale) => set({ stale: stale }),
}));
