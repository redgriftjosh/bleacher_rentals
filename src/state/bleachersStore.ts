"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  bleachers: any[];
  loading: boolean;
  setBleachers: (data: any[]) => void;
  setLoading: (loading: boolean) => void;
};

export const useBleachersStore = create<Store>((set) => ({
  bleachers: [],
  loading: true,
  setBleachers: (data) => set({ bleachers: data }),
  setLoading: (loading) => set({ loading: loading }),
}));
