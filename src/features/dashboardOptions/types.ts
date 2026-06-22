export type YAxis = "Bleachers" | "Events";

// quick-toggle: 10 rows, 15 rows, or all
export type RowsQuickFilter = 10 | 15 | null;

export type DashboardFilterState = {
  yAxis: YAxis;

  // row counts to include (e.g. [7, 10, 15])
  rows: number[];

  // indices into STATES+PROVINCES
  stateProvinces: number[];

  onlyShowMyEvents: boolean;
  optimizationMode: boolean;
  showAddressTooltip: boolean;

  // convenience UI toggle (also persisted)
  rowsQuickFilter: RowsQuickFilter;
};
