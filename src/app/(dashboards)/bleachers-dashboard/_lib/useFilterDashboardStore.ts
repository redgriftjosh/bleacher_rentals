import { create } from "zustand";

export type YAxis = "Bleachers" | "Events";

export type FilterDashboardState = {
  yAxis: YAxis;
  homeBaseIds: number[];
  winterHomeBaseIds: number[];
  rows: number[];
};

// Me take event form stuff, add tools to change it.
export type FilterDashboardStore = FilterDashboardState & {
  // Me give key and value. Me change that part in box.
  setField: <K extends keyof FilterDashboardState>(key: K, value: FilterDashboardState[K]) => void;

  // Me smash reset. Everything go back to start.
  resetForm: () => void;
};

const initialState: FilterDashboardState = {
  yAxis: "Bleachers",
  homeBaseIds: [],
  winterHomeBaseIds: [],
  rows: [],
};

// Me make magic state box. Inside: all starting data. Also tools to change data.
export const useFilterDashboardStore = create<FilterDashboardStore>((set) => ({
  // Me copy all default values.
  ...initialState,

  // Me update one thing inside box.
  setField: (key, value) => set((state) => ({ ...state, [key]: value })),

  // Boom. Reset everything.
  resetForm: () => set(initialState),
}));
