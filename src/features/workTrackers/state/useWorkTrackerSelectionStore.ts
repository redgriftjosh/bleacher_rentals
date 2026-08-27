"use client";

import { create } from "zustand";
import { Tables } from "../../../../database.types";

export type WorkTrackerSelection = {
  id: string;
  bleacher_uuid: string;
  date: string;
} | null;

/**
 * A brand-new work tracker opened straight from the grid (⌘/Ctrl+click on an empty cell).
 *
 * Unlike `selected` — which only identifies a row the modal then fetches — this carries the
 * whole draft, because there is nothing in the database to fetch yet.
 */
export type WorkTrackerDraft = {
  workTracker: Tables<"WorkTrackers">;
  /** Run the pickup/dropoff address + POC locators as soon as the modal opens. */
  autoPopulate: boolean;
  /** Bumped on every request so re-opening the same cell re-triggers the subscriber. */
  requestId: number;
} | null;

type Store = {
  selected: WorkTrackerSelection;
  setSelected: (wt: WorkTrackerSelection) => void;
  draft: WorkTrackerDraft;
  openDraft: (workTracker: Tables<"WorkTrackers">, options?: { autoPopulate?: boolean }) => void;
  clear: () => void;
};

export const useWorkTrackerSelectionStore = create<Store>((set) => ({
  selected: null,
  // The two entry points are mutually exclusive: opening one clears the other so a stale value
  // cannot win, since `subscribe` fires every listener on every change.
  setSelected: (wt) => set({ selected: wt, draft: null }),
  draft: null,
  openDraft: (workTracker, options) =>
    set((state) => ({
      selected: null,
      draft: {
        workTracker,
        autoPopulate: options?.autoPopulate ?? false,
        requestId: (state.draft?.requestId ?? 0) + 1,
      },
    })),
  clear: () => set({ selected: null, draft: null }),
}));
