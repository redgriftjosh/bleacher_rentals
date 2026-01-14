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
  status_uuid: string | null;

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
  loadExistingUser: (userUuid: string, supabase: SupabaseClient<Database>) => Promise<void>;
  openForNewUser: () => void;
};

const initialState: CurrentUserState = {
  firstName: "",
  lastName: "",
  email: "",
  isAdmin: false,
  status_uuid: null,
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

  loadExistingUser: async (userUuid, supabase) => {
    set({ existingUserUuid: userUuid, isSubmitting: true });

    const result = await fetchUserById(userUuid);

    set({
      firstName: result.firstName ?? "",
      lastName: result.lastName ?? "",
      email: result.email ?? "",
      isAdmin: result.isAdmin === 1,
      status_uuid: result.data.status_uuid,
      isDriver: result.data.isDriver,
      isAccountManager: result.data.isAccountManager,
      tax: result.data.tax,
      payRateCents: result.data.payRateCents,
      payCurrency: result.data.payCurrency,
      payPerUnit: result.data.payPerUnit,
      accountManagerUuid: result.data.accountManagerUuid,
      summerBleacherUuids: result.data.summerBleacherUuids,
      winterBleacherUuids: result.data.winterBleacherUuids,
      assignedDriverUuids: result.data.assignedDriverUuids,
      existingUserUuid: userUuid,
      isOpen: true,
      isSubmitting: false,
      });
  },

  openForNewUser: () => {
    set({ ...initialState, isOpen: true });
  },
}));
