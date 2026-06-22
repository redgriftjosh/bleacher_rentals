"use client";

import { create } from "zustand";

export type SubrentalStatus = "pending" | "accepted" | "denied";

export type SubrentalEventState = {
  subrentalEventUuid: string | null;
  createdByUserUuid: string | null;
  eventStart: string;
  eventEnd: string;
  bleacherUuid: string | null;
  requestedZoneUuid: string | null;
  notes: string;
  status: SubrentalStatus;
  reviewedByUserUuid: string | null;
  reviewedAt: string | null;
  isModalOpen: boolean;
  isFormExpanded: boolean;
  isFormMinimized: boolean;
};

type SubrentalEventActions = {
  setField: <K extends keyof SubrentalEventState>(key: K, value: SubrentalEventState[K]) => void;
  resetForm: () => void;
  openModal: () => void;
  closeModal: () => void;
  openForm: () => void;
  closeForm: () => void;
};

export type SubrentalEventStore = SubrentalEventState & SubrentalEventActions;

const initialState: SubrentalEventState = {
  subrentalEventUuid: null,
  createdByUserUuid: null,
  eventStart: "",
  eventEnd: "",
  bleacherUuid: null,
  requestedZoneUuid: null,
  notes: "",
  status: "pending",
  reviewedByUserUuid: null,
  reviewedAt: null,
  isModalOpen: false,
  isFormExpanded: false,
  isFormMinimized: false,
};

export const useSubrentalEventStore = create<SubrentalEventStore>((set) => ({
  ...initialState,
  setField: (key, value) => set({ [key]: value }),
  resetForm: () => set({ ...initialState }),
  openModal: () => set({ ...initialState, isModalOpen: true }),
  closeModal: () => set({ ...initialState }),
  openForm: () => set({ ...initialState, isFormExpanded: true }),
  closeForm: () => set({ ...initialState }),
}));
