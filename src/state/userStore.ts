"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  users: any[];
  loading: boolean;
  setUsers: (data: any[]) => void;
  setLoading: (loading: boolean) => void;
};

export const useUsersStore = create<Store>((set) => ({
  users: [],
  loading: true,
  setUsers: (data) => set({ users: data }),
  setLoading: (loading) => set({ loading: loading }),
}));
