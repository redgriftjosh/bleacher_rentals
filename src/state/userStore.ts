"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  users: Tables<"Users">[];
  stale: boolean;
  setUsers: (data: Tables<"Users">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useUsersStore = create<Store>((set) => ({
  users: [],
  stale: true,
  setUsers: (data) => set({ users: data }),
  setStale: (stale) => set({ stale: stale }),
}));
