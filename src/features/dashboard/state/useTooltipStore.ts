"use client";
import { create } from "zustand";

/**
 * Content shown by the shared dashboard hover tooltip. The two kinds are mutually
 * exclusive (enforced by the Options menu) but the store only ever holds one.
 *
 * - address:  a fully resolved street string, rendered as-is.
 * - distance: the origin/dest address strings; the actual "mi (km)" value is fetched
 *             lazily by the render component (react-query), so the imperative Pixi
 *             layer that drives this store stays synchronous.
 */
export type TooltipContent =
  | { kind: "address"; text: string }
  | { kind: "distance"; origin: string; dest: string };

type TooltipState = {
  content: TooltipContent | null;
  x: number;
  y: number;
  show: (content: TooltipContent, x: number, y: number) => void;
  hide: () => void;
};

export const useTooltipStore = create<TooltipState>((set) => ({
  content: null,
  x: 0,
  y: 0,
  show: (content, x, y) => set({ content, x, y }),
  hide: () => set({ content: null }),
}));
