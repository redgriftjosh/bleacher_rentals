import { create } from "zustand";

/**
 * Lightweight permissions store that can be read from non-React code
 * (e.g. Pixi.js renderers). Populated by PermissionsSync component.
 */
type PermissionsState = {
  isAdmin: boolean;
  isAccountManager: boolean;
  accountManagerId: string | null;
  accountManagerZoneIds: string[];
  userId: string | null;
};

export const usePermissionsStore = create<PermissionsState>(() => ({
  isAdmin: false,
  isAccountManager: false,
  accountManagerId: null,
  accountManagerZoneIds: [],
  userId: null,
}));
