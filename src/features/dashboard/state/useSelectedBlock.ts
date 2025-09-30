"use client";
import { create } from "zustand";

export type SelectedBlockState = {
  isOpen: boolean;
  key: string;
  blockId: number | null;
  bleacherId: number;
  date: string;
  text: string;
  workTrackerId: number | null;
};

// Me take event form stuff, add tools to change it.
export type SelectedBlockStore = SelectedBlockState & {
  // Me give key and value. Me change that part in box.
  setField: <K extends keyof SelectedBlockState>(key: K, value: SelectedBlockState[K]) => void;

  // Me smash reset. Everything go back to start.
  resetForm: () => void;
};

const initialState: SelectedBlockState = {
  isOpen: false,
  key: "",
  blockId: null,
  bleacherId: 0,
  date: "",
  text: "",
  workTrackerId: null,
};

// Me make magic state box. Inside: all starting data. Also tools to change data.
export const useSelectedBlockStore = create<SelectedBlockStore>((set) => ({
  // Me copy all default values.
  ...initialState,

  // Me update one thing inside box.
  setField: (key, value) => set((state) => ({ ...state, [key]: value })),

  // Boom. Reset everything.
  resetForm: () => set(initialState),
}));
