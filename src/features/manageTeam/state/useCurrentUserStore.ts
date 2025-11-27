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
  status: number | null;

  // Role flags
  isDriver: boolean;
  isAccountManager: boolean;

  // Driver-specific fields
  tax: number | undefined;
  payRateCents: number | null;
  payCurrency: "CAD" | "USD";
  payPerUnit: "KM" | "MI" | "HR";
  accountManagerId: number | null;

  // Account Manager-specific fields
  summerBleacherIds: number[];
  winterBleacherIds: number[];
  assignedDriverIds: number[];

  // UI state
  existingUserId: number | null;
  isOpen: boolean;
  isSubmitting: boolean;
};

export type CurrentUserStore = CurrentUserState & {
  setField: <K extends keyof CurrentUserState>(key: K, value: CurrentUserState[K]) => void;
  setIsOpen: (isOpen: boolean) => void;
  resetForm: () => void;
  loadExistingUser: (userId: number, supabase: SupabaseClient<Database>) => Promise<void>;
  openForNewUser: () => void;
};

const initialState: CurrentUserState = {
  firstName: "",
  lastName: "",
  email: "",
  isAdmin: false,
  status: null,
  isDriver: false,
  isAccountManager: false,
  tax: undefined,
  payRateCents: null,
  payCurrency: "CAD",
  payPerUnit: "KM",
  accountManagerId: null,
  summerBleacherIds: [],
  winterBleacherIds: [],
  assignedDriverIds: [],
  existingUserId: null,
  isOpen: false,
  isSubmitting: false,
};

export const useCurrentUserStore = create<CurrentUserStore>((set) => ({
  ...initialState,

  setField: (key, value) => set((state) => ({ ...state, [key]: value })),

  setIsOpen: (isOpen) => set({ isOpen }),

  resetForm: () => set(initialState),

  loadExistingUser: async (userId, supabase) => {
    set({ existingUserId: userId, isSubmitting: true });

    const result = await fetchUserById(supabase, userId);

    if (result.success && result.data) {
      set({
        firstName: result.data.firstName ?? "",
        lastName: result.data.lastName ?? "",
        email: result.data.email,
        isAdmin: result.data.isAdmin,
        status: result.data.status,
        isDriver: result.data.isDriver,
        isAccountManager: result.data.isAccountManager,
        tax: result.data.tax,
        payRateCents: result.data.payRateCents,
        payCurrency: result.data.payCurrency,
        payPerUnit: result.data.payPerUnit,
        accountManagerId: result.data.accountManagerId,
        summerBleacherIds: result.data.summerBleacherIds,
        winterBleacherIds: result.data.winterBleacherIds,
        assignedDriverIds: result.data.assignedDriverIds,
        existingUserId: userId,
        isOpen: true,
        isSubmitting: false,
      });
    } else {
      console.error("Failed to load user:", result.error);
      set({ isSubmitting: false });
    }
  },

  openForNewUser: () => {
    set({ ...initialState, isOpen: true });
  },
}));
