"use client";

import { create } from "zustand";
import { fetchUserById } from "../db/userQueries";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../database.types";

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

  // Driver-specific fields
  tax: number | undefined;
  payRateCents: number | null;
  payCurrency: "CAD" | "USD";
  payPerUnit: "KM" | "MI" | "HR";
  accountManagerUuid: string | null;

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
  setIsOpen: (isOpen: boolean) => void;
  resetForm: () => void;
  loadExistingUser: (userUuid: string) => Promise<void>;
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
  tax: undefined,
  payRateCents: null,
  payCurrency: "CAD",
  payPerUnit: "KM",
  accountManagerUuid: null,
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

  setIsOpen: (isOpen) => set({ isOpen }),

  resetForm: () => set(initialState),

  loadExistingUser: async (userUuid) => {
    set({ existingUserUuid: userUuid, isOpen: true });

    // const result = await fetchUserById(userUuid);

    // set(
    //   result
    //     ? { ...result, existingUserUuid: userUuid, isOpen: true, isSubmitting: false }
    //     : { isSubmitting: false }
    // );
  },

  openForNewUser: () => {
    set({ ...initialState, isOpen: true });
  },
}));
