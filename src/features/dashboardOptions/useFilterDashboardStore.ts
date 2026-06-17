import { create } from "zustand";

export type YAxis = "Bleachers" | "Events";

export type FilterDashboardState = {
  yAxis: YAxis;
  rows: number[];
  stateProvinces: number[];
  onlyShowMyEvents: boolean;
  optimizationMode: boolean;
};

export type FilterDashboardStore = FilterDashboardState & {
  setField: <K extends keyof FilterDashboardState>(key: K, value: FilterDashboardState[K]) => void;
  resetForm: () => void;
};

const initialState: FilterDashboardState = {
  yAxis: "Bleachers",
  rows: [],
  stateProvinces: [],
  onlyShowMyEvents: true,
  optimizationMode: false,
};

export const useFilterDashboardStore = create<FilterDashboardStore>((set) => ({
  ...initialState,
  setField: (key, value) => set((state) => ({ ...state, [key]: value })),
  resetForm: () => set(initialState),
}));
