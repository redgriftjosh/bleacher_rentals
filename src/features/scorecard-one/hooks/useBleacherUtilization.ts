"use client";

import { ScorecardData } from "./types";

// TODO: Implement actual logic for bleacher utilization
// This should calculate bleacher usage metrics (need to clarify the calculation)
export function useBleacherUtilization(_accountManagerUuid?: string): ScorecardData {
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
    label: "Bleacher Utilization",
  };
}
