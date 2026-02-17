"use client";

import { ScorecardData } from "./types";

// TODO: Implement actual logic for value of quotes signed
// This should sum contract_revenue_cents for Events where event_status changed to 'signed'
export function useValueOfQuotesSigned(_accountManagerUuid?: string): ScorecardData {
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
    label: "Value of Quotes Signed",
  };
}
