import { WorkTrackerRow, WorkTrackerFilters } from "../types";
import { isWithinRange } from "@/features/quotesAndBookings/utils/dateRange";

export function filterWorkTrackers(
  workTrackers: WorkTrackerRow[],
  filters: WorkTrackerFilters,
  timezone?: string,
): WorkTrackerRow[] {
  return workTrackers.filter((wt) => {
    if (filters.statuses.length > 0) {
      const status = wt.status?.toLowerCase() ?? "";
      if (!filters.statuses.includes(status)) return false;
    }

    if (!isWithinRange(wt.date, filters.dateFrom, filters.dateTo, timezone)) {
      return false;
    }

    if (!isWithinRange(wt.completed_at, filters.completedFrom, filters.completedTo, timezone)) {
      return false;
    }

    if (filters.driverUuid) {
      if (wt.driver_uuid !== filters.driverUuid) return false;
    }

    if (filters.accountManagerUuid) {
      if (wt.driver_account_manager_uuid !== filters.accountManagerUuid) return false;
    }

    return true;
  });
}
