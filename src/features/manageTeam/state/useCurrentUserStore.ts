"use client";

import { create } from "zustand";
import { fetchUserById } from "../db/userQueries";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../database.types";
import { AddressData } from "@/features/eventConfiguration/state/useCurrentEventStore";

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
  phoneNumber: string | null;
  driverAddress: AddressData | null;
  licensePhotoPath: string | null;
  insurancePhotoPath: string | null;
  medicalCardPhotoPath: string | null;
  vehicleId: number | null;
  // Vehicle fields (embedded for convenience)
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVin: string | null;

  // Account Manager-specific fields
  summerBleacherIds: number[];
  winterBleacherIds: number[];
  assignedDriverIds: number[];

  // UI state
  existingUserId: number | null;
  existingDriverId: number | null;
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
  phoneNumber: null,
  driverAddress: null,
  licensePhotoPath: null,
  insurancePhotoPath: null,
  medicalCardPhotoPath: null,
  vehicleId: null,
  vehicleMake: null,
  vehicleModel: null,
  vehicleYear: null,
  vehicleVin: null,
  summerBleacherIds: [],
  winterBleacherIds: [],
  assignedDriverIds: [],
  existingUserId: null,
  existingDriverId: null,
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

    console.log("fetchUserById result:", result);

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
        phoneNumber: result.data.phoneNumber,
        driverAddress: result.data.driverAddress,
        licensePhotoPath: result.data.licensePhotoPath,
        insurancePhotoPath: result.data.insurancePhotoPath,
        medicalCardPhotoPath: result.data.medicalCardPhotoPath,
        vehicleId: result.data.vehicleId,
        vehicleMake: result.data.vehicleMake,
        vehicleModel: result.data.vehicleModel,
        vehicleYear: result.data.vehicleYear,
        vehicleVin: result.data.vehicleVin,
        summerBleacherIds: result.data.summerBleacherIds,
        winterBleacherIds: result.data.winterBleacherIds,
        assignedDriverIds: result.data.assignedDriverIds,
        existingUserId: userId,
        existingDriverId: result.data.driverId ?? null,
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
