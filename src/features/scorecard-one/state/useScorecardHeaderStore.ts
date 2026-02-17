"use client";

import { create } from "zustand";
import type { TimeRange } from "@/features/scorecard-one/types";

type ManagerOption = {
  id: string;
  name: string;
};

type ScorecardHeaderState = {
  activeRange: TimeRange;
  setActiveRange: (range: TimeRange) => void;
  activeMetric: string;
  setActiveMetric: (metric: string) => void;
  activeManagerId: string | null;
  setActiveManagerId: (managerId: string | null) => void;
  managers: ManagerOption[];
  setManagers: (managers: ManagerOption[]) => void;
};

export const useScorecardHeaderStore = create<ScorecardHeaderState>((set) => ({
  activeRange: "weekly",
  setActiveRange: (range) => set({ activeRange: range }),
  activeMetric: "Overview",
  setActiveMetric: (metric) => set({ activeMetric: metric }),
  activeManagerId: null,
  setActiveManagerId: (managerId) => set({ activeManagerId: managerId }),
  managers: [],
  setManagers: (managers) => set({ managers }),
}));
