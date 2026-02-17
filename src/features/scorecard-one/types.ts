/** Time range granularity for scorecard metrics */
export type TimeRange = "weekly" | "quarterly" | "annually";

/** The 4 KPI metric types */
export type MetricType = "quotes" | "sales" | "valueOfSales" | "valueOfRevenue";

/** Computed metrics for a single account manager in a single time range */
export type ScorecardMetrics = {
  quotes: number;
  sales: number;
  /** Sum of contract_revenue_cents for booked events (created_at in range) */
  valueOfSalesCents: number;
  /** Sum of contract_revenue_cents for booked events (event_start in range) */
  valueOfRevenueCents: number;
};

/** Targets for a single account manager */
export type ScorecardTargetsData = {
  quotesWeekly: number;
  quotesQuarterly: number;
  quotesAnnually: number;
  salesWeekly: number;
  salesQuarterly: number;
  salesAnnually: number;
  valueOfSalesWeeklyCents: number;
  valueOfSalesQuarterlyCents: number;
  valueOfSalesAnnuallyCents: number;
  valueOfRevenueWeeklyCents: number;
  valueOfRevenueQuarterlyCents: number;
  valueOfRevenueAnnuallyCents: number;
};

/** Default targets matching DB defaults */
export const DEFAULT_TARGETS: ScorecardTargetsData = {
  quotesWeekly: 7,
  quotesQuarterly: 60,
  quotesAnnually: 250,
  salesWeekly: 3,
  salesQuarterly: 35,
  salesAnnually: 150,
  valueOfSalesWeeklyCents: 2500000,
  valueOfSalesQuarterlyCents: 30000000,
  valueOfSalesAnnuallyCents: 120000000,
  valueOfRevenueWeeklyCents: 7500000,
  valueOfRevenueQuarterlyCents: 120000000,
  valueOfRevenueAnnuallyCents: 480000000,
};

/** Account manager info for display */
export type AccountManagerInfo = {
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  clerkUserId: string | null;
  avatarUrl: string | null;
};

/** Full scorecard data for one account manager */
export type AccountManagerScorecard = {
  manager: AccountManagerInfo;
  targets: ScorecardTargetsData;
  weekly: ScorecardMetrics;
  quarterly: ScorecardMetrics;
  annually: ScorecardMetrics;
};

/** Human-readable labels for metrics */
export const METRIC_LABELS: Record<MetricType, string> = {
  quotes: "Quotes",
  sales: "Sales",
  valueOfSales: "Value of Sales",
  valueOfRevenue: "Value of Revenue",
};

/** Whether a metric is currency-based */
export function isMoneyMetric(metric: MetricType): boolean {
  return metric === "valueOfSales" || metric === "valueOfRevenue";
}

/** Human-readable labels for time ranges */
export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  weekly: "This Week",
  quarterly: "This Quarter",
  annually: "This Year",
};
