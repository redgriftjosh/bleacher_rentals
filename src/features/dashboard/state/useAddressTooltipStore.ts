"use client";
import { create } from "zustand";

type AddressTooltipState = {
  text: string | null;
  x: number;
  y: number;
  show: (text: string, x: number, y: number) => void;
  hide: () => void;
};

export const useAddressTooltipStore = create<AddressTooltipState>((set) => ({
  text: null,
  x: 0,
  y: 0,
  show: (text, x, y) => set({ text, x, y }),
  hide: () => set({ text: null }),
}));
