"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  blocks: Tables<"Blocks">[];
  stale: boolean;
  setBlocks: (data: Tables<"Blocks">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useBlocksStore = create<Store>((set) => ({
  blocks: [],
  stale: true,
  setBlocks: (data) => set({ blocks: data }),
  setStale: (stale) => set({ stale: stale }),
}));
