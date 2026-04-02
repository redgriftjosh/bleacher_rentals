"use client";
import { create } from "zustand";

type ScrollToDateState = {
  scrollToDate: ((date: string) => void) | null;
  setScrollToDate: (fn: ((date: string) => void) | null) => void;
};

export const useScrollToDateStore = create<ScrollToDateState>((set) => ({
  scrollToDate: null,
  setScrollToDate: (fn) => set({ scrollToDate: fn }),
}));
