import { create } from "zustand";

export type YAxis = "Bleachers" | "Events";
export type Season = "SUMMER" | "WINTER" | null; // null = Don't Filter (both)

export type FilterDashboardState = {
  yAxis: YAxis;
  summerHomeBaseUuids: string[];
  winterHomeBaseUuids: string[];
  rows: number[];
  stateProvinces: number[];
  onlyShowMyEvents: boolean;
  optimizationMode: boolean;
  season: Season; // nullable: null => Don't Filter (both)
  // dynamically set by DashboardApp when fetched for current user; used in filtering
  summerAssignedBleacherUuids?: string[];
  winterAssignedBleacherUuids?: string[];
};

// Me take event form stuff, add tools to change it.
export type FilterDashboardStore = FilterDashboardState & {
  // Me give key and value. Me change that part in box.
  setField: <K extends keyof FilterDashboardState>(key: K, value: FilterDashboardState[K]) => void;

  // Me smash reset. Everything go back to start.
  resetForm: () => void;
};

// Determine default season based on current date
const getDefaultSeason = (): Season => {
  const now = new Date();
  // const now = new Date(2025, 11, 1); // December 1st, 2025 (month is 0-indexed)
  const month = now.getMonth(); // 0-indexed: 0 = January, 11 = December

  // June 1st or later (month >= 5) -> SUMMER
  // December 1st or later (month >= 11) -> WINTER
  if (month >= 11) return "WINTER"; // December
  if (month >= 5) return "SUMMER"; // June through November
  return "WINTER"; // January through May
};

const initialState: FilterDashboardState = {
  yAxis: "Bleachers",
  summerHomeBaseUuids: [],
  winterHomeBaseUuids: [],
  rows: [],
  stateProvinces: [],
  onlyShowMyEvents: true,
  optimizationMode: false,
  season: getDefaultSeason(),
  summerAssignedBleacherUuids: [],
  winterAssignedBleacherUuids: [],
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
