"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  homeBases: any[];
  loading: boolean;
  setHomeBases: (data: any[]) => void;
  setLoading: (loading: boolean) => void;
};

export const useHomeBasesStore = create<Store>((set) => ({
  homeBases: [],
  loading: true,
  setHomeBases: (data) => set({ homeBases: data }),
  setLoading: (loading) => set({ loading: loading }),
}));
