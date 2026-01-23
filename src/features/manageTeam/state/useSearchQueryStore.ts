"use client";

import { create } from "zustand";

export type SearchQueryState = {
  searchQuery: string;
};

export type SearchQueryStore = SearchQueryState & {
  setField: <K extends keyof SearchQueryState>(key: K, value: SearchQueryState[K]) => void;
};

const initialState: SearchQueryState = {
  searchQuery: "",
};

export const useSearchQueryStore = create<SearchQueryStore>((set) => ({
  ...initialState,
  setField: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
