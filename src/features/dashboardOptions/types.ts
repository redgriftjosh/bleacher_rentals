export type YAxis = "Bleachers" | "Events";

// null = "All Bleachers"
export type Season = "SUMMER" | "WINTER" | null;

// quick-toggle: 10 rows, 15 rows, or all
export type RowsQuickFilter = 10 | 15 | null;

export type DashboardFilterState = {
  yAxis: YAxis;

  summerHomeBaseUuids: string[];
  winterHomeBaseUuids: string[];

  // row counts to include (e.g. [7, 10, 15])
  rows: number[];

  // indices into STATES+PROVINCES
  stateProvinces: number[];

  onlyShowMyEvents: boolean;
  optimizationMode: boolean;

  // nullable: null => don't filter (both)
  season: Season;

  // Only used when season is SUMMER/WINTER
  accountManagerUuid: string | null;

  // convenience UI toggle (also persisted)
  rowsQuickFilter: RowsQuickFilter;
};

export const getDefaultSeason = (): Season => {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan

  // June 1st or later (month >= 5) -> SUMMER
  // December 1st or later (month >= 11) -> WINTER
  if (month >= 11) return "WINTER"; // December
  if (month >= 5) return "SUMMER"; // June through November
  return "WINTER"; // January through May
};
