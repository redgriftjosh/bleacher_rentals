export type StatType =
  | "number-of-quotes-sent"
  | "number-of-quotes-signed"
  | "value-of-quotes-signed"
  | "revenue"
  | "bleacher-utilization";

export type TimeRange = "weekly" | "quarterly" | "annually";

/** Maps StatType to the corresponding ScorecardTargets column prefix */
export const STAT_TARGET_COLUMNS: Record<
  StatType,
  { weekly: string; quarterly: string; annually: string }
> = {
  "number-of-quotes-sent": {
    weekly: "quotes_weekly",
    quarterly: "quotes_quarterly",
    annually: "quotes_annually",
  },
  "number-of-quotes-signed": {
    weekly: "sales_weekly",
    quarterly: "sales_quarterly",
    annually: "sales_annually",
  },
  "value-of-quotes-signed": {
    weekly: "value_of_sales_weekly_cents",
    quarterly: "value_of_sales_quarterly_cents",
    annually: "value_of_sales_annually_cents",
  },
  revenue: {
    weekly: "value_of_revenue_weekly_cents",
    quarterly: "value_of_revenue_quarterly_cents",
    annually: "value_of_revenue_annually_cents",
  },
  "bleacher-utilization": {
    weekly: "quotes_weekly", // placeholder - no specific target column yet
    quarterly: "quotes_quarterly",
    annually: "quotes_annually",
  },
};

export const STAT_LABELS: Record<StatType, string> = {
  "number-of-quotes-sent": "Quotes Sent",
  "number-of-quotes-signed": "Quotes Signed",
  "value-of-quotes-signed": "Value of Quotes Signed",
  revenue: "Revenue",
  "bleacher-utilization": "Bleacher Utilization",
};

export interface DayData {
  day: string; // "M", "T", "W", etc.
  dayLabel: string; // "Monday", "Tuesday", etc.
  thisWeek: number | null;
  lastWeek: number;
  pace: number;
}

export interface ScorecardData {
  thisWeek: {
    current: number;
    goal: number;
    paceTarget: number;
    dayOfWeek: number; // 1-7 (Mon-Sun)
  };
  lastWeek: {
    totalAtEnd: number;
    paceAtDay: number; // Value at same day of week as today
    goal: number;
    dayOfWeek: number;
  };
  chartData: DayData[];
  label: string; // Display name for the stat type
}
