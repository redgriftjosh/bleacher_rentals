"use client";

import { ScorecardData } from "./types";

// TODO: Implement actual logic for number of quotes signed
// This should track Events where event_status changed to 'signed' during the week
export function useNumberOfQuotesSigned(_accountManagerUuid?: string): ScorecardData {
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
    label: "Quotes Signed",
  };
}
