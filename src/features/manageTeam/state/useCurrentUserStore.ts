"use client";

import { create } from "zustand";
import { fetchUserById } from "../db/userOperations";

export type TeamRoleTab = "administrator" | "account-manager" | "driver";

export type CurrentUserState = {
  // Basic user info
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  statusUuid: string | null;

  // Role flags
  isDriver: boolean;
  isAccountManager: boolean;
  roleTabs: TeamRoleTab[];

  // Driver-specific fields
  tax: number | undefined;
  payRateCents: number | null;
  payCurrency: "CAD" | "USD";
  payPerUnit: "KM" | "MI" | "HR";
  accountManagerUuid: string | null;
  vendorUuid: string | null;

  // Driver setup (optional - can be set by driver in mobile app)
  phoneNumber: string | null;
  addressUuid: string | null;
  homeAddress: string | null;
  homeCity: string | null;
  homeState: string | null;
  homePostalCode: string | null;
  vehicleUuid: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVin: string | null;
  licensePhotoPath: string | null;
  insurancePhotoPath: string | null;
  medicalCardPhotoPath: string | null;

  // Account Manager-specific fields
  summerBleacherUuids: string[];
  winterBleacherUuids: string[];
  assignedDriverUuids: string[];

  // UI state
  existingUserUuid: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
};

export type CurrentUserStore = CurrentUserState & {
  setField: <K extends keyof CurrentUserState>(key: K, value: CurrentUserState[K]) => void;
  addRoleTab: (role: TeamRoleTab) => void;
  removeRoleTab: (role: TeamRoleTab) => void;
  setIsOpen: (isOpen: boolean) => void;
  resetForm: () => void;
  loadExistingUser: (userUuid: string, supabase: any) => Promise<void>;
  openForNewUser: () => void;
};

const initialState: CurrentUserState = {
  firstName: "",
  lastName: "",
  email: "",
  isAdmin: false,
  statusUuid: null,
  isDriver: false,
  isAccountManager: false,
  roleTabs: [],
  tax: undefined,
  payRateCents: null,
  payCurrency: "CAD",
  payPerUnit: "KM",
  accountManagerUuid: null,
  vendorUuid: null,
  phoneNumber: null,
  addressUuid: null,
  homeAddress: null,
  homeCity: null,
  homeState: null,
  homePostalCode: null,
  vehicleUuid: null,
  vehicleMake: null,
  vehicleModel: null,
  vehicleYear: null,
  vehicleVin: null,
  licensePhotoPath: null,
  insurancePhotoPath: null,
  medicalCardPhotoPath: null,
  summerBleacherUuids: [],
  winterBleacherUuids: [],
  assignedDriverUuids: [],
  existingUserUuid: null,
  isOpen: false,
  isSubmitting: false,
};

export const useCurrentUserStore = create<CurrentUserStore>((set) => ({
  ...initialState,

  setField: (key, value) => set((state) => ({ ...state, [key]: value })),

  addRoleTab: (role) =>
    set((state) => {
      if (state.roleTabs.includes(role)) return state;

      return {
        ...state,
        roleTabs: [...state.roleTabs, role],
        isAdmin: role === "administrator" ? true : state.isAdmin,
        isAccountManager: role === "account-manager" ? true : state.isAccountManager,
        isDriver: role === "driver" ? true : state.isDriver,
      };
    }),

  removeRoleTab: (role) =>
    set((state) => {
      if (!state.roleTabs.includes(role)) return state;

      const nextRoleTabs = state.roleTabs.filter((r) => r !== role);

      return {
        ...state,
        roleTabs: nextRoleTabs,
        isAdmin: role === "administrator" ? false : state.isAdmin,
        isAccountManager: role === "account-manager" ? false : state.isAccountManager,
        isDriver: role === "driver" ? false : state.isDriver,
      };
    }),

  setIsOpen: (isOpen) => set({ isOpen }),

  resetForm: () => set(initialState),

  loadExistingUser: async (userUuid, supabase) => {
    set({ existingUserUuid: userUuid, isOpen: true });

    const result = await fetchUserById(supabase, userUuid);

    if (result) {
      set({ ...result, existingUserUuid: userUuid, isOpen: true, isSubmitting: false });
    } else {
      console.error("Failed to load user data");
      set({ isSubmitting: false });
    }
  },

  openForNewUser: () => {
    set({ ...initialState, isOpen: true });
  },
}));
