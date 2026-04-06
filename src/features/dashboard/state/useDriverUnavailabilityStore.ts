import { create } from "zustand";

type DriverUnavailabilityStoreState = {
  /** Set of "driverUuid:YYYY-MM-DD" keys */
  unavailableKeys: Set<string>;
  setUnavailableKeys: (keys: Set<string>) => void;
};

export const useDriverUnavailabilityStore = create<DriverUnavailabilityStoreState>((set) => ({
  unavailableKeys: new Set(),
  setUnavailableKeys: (keys) => set({ unavailableKeys: keys }),
}));

/** O(1) check from PixiJS code (no hook needed). */
export function isDriverUnavailable(driverUuid: string | null, date: string): boolean {
  if (!driverUuid) return false;
  return useDriverUnavailabilityStore.getState().unavailableKeys.has(`${driverUuid}:${date}`);
}
