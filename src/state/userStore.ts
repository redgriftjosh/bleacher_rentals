"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  users: any[];
  stale: boolean;
  setUsers: (data: any[]) => void;
  setStale: (stale: boolean) => void;
};

export const useUsersStore = create<Store>((set) => ({
  users: [],
  stale: true,
  setUsers: (data) => set({ users: data }),
  setStale: (stale) => set({ stale: stale }),
}));
