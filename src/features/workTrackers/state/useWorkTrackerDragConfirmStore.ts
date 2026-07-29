import { create } from "zustand";
import type { BleacherWorkTracker } from "@/features/dashboard/types";

type PendingDragConfirm = {
  tracker: BleacherWorkTracker;
  resolve: (confirmed: boolean) => void;
};

type WorkTrackerDragConfirmState = {
  pending: PendingDragConfirm | null;
  requestConfirm: (tracker: BleacherWorkTracker) => Promise<boolean>;
  respond: (confirmed: boolean) => void;
};

export const useWorkTrackerDragConfirmStore = create<WorkTrackerDragConfirmState>((set, get) => ({
  pending: null,
  requestConfirm: (tracker) =>
    new Promise<boolean>((resolve) => {
      set({ pending: { tracker, resolve } });
    }),
  respond: (confirmed) => {
    const pending = get().pending;
    if (!pending) return;
    pending.resolve(confirmed);
    set({ pending: null });
  },
}));
