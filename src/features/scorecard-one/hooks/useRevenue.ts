"use client";

import { ScorecardData } from "./types";

// TODO: Implement actual logic for revenue
// This should track actual revenue (need to clarify the data source)
export function useRevenue(_accountManagerUuid?: string): ScorecardData {
  return {
    thisWeek: {
      current: 0,
      goal: 0,
      paceTarget: 0,
      dayOfWeek: new Date().getDay() || 7,
    },
    lastWeek: {
      totalAtEnd: 0,
      paceAtDay: 0,
      goal: 0,
      dayOfWeek: new Date().getDay() || 7,
    },
    chartData: [],
    label: "Revenue",
  };
}
