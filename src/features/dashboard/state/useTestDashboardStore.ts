"use client";

import { create } from "zustand";

export type Cell = {
  x: number;
  h: number;
  hex: number;
};

export type TestDashboardState = {
  cells: Cell[];
};

// Me take event form stuff, add tools to change it.
export type TestDashboardStore = TestDashboardState & {
  // Me give key and value. Me change that part in box.
  setField: <K extends keyof TestDashboardState>(key: K, value: TestDashboardState[K]) => void;

  // Me smash reset. Everything go back to start.
  resetForm: () => void;
};

const initialState: TestDashboardState = {
  cells: [],
};

// Me make magic state box. Inside: all starting data. Also tools to change data.
export const useCurrentEventStore = create<TestDashboardStore>((set) => ({
  // Me copy all default values.
  ...initialState,

  // Me update one thing inside box.
  setField: (key, value) => set((state) => ({ ...state, [key]: value })),

  // Boom. Reset everything.
  resetForm: () => set(initialState),
}));
