"use client";
import { create } from "zustand";

type DataRefreshTokenState = {
  token: number;
  bump: () => void;
  reset: () => void;
};

export const useDataRefreshTokenStore = create<DataRefreshTokenState>((set) => ({
  token: 0,
  bump: () => set((s) => ({ token: s.token + 1 })),
  reset: () => set({ token: 0 }),
}));
