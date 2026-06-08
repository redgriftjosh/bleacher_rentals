import { DateTime } from "luxon";
import { WorkTrackerFilters } from "../types";

export type WorkTrackerTemplate = "driver-pay";

export const WORK_TRACKER_TEMPLATES: Record<
  WorkTrackerTemplate,
  { label: string; description: string }
> = {
  "driver-pay": {
    label: "Driver Pay",
    description:
      "Showing all work trackers whose Work Date falls within the selected period. The scorecard sums the total pay of those work trackers.",
  },
};

export function isWorkTrackerTemplate(value: string | null): value is WorkTrackerTemplate {
  return value !== null && value in WORK_TRACKER_TEMPLATES;
}

type TimeRange = "weekly" | "quarterly" | "annually";

function getPeriodDates(
  timeRange: TimeRange,
  period: "this" | "last",
  anchor?: string | null,
): { from: string; to: string } {
  const dt = anchor ? DateTime.fromISO(anchor) : DateTime.local();
  const now = dt.isValid ? dt : DateTime.local();
  if (timeRange === "quarterly") {
    const start =
      period === "this"
        ? now.startOf("quarter")
        : now.startOf("quarter").minus({ quarters: 1 });
    const end =
      period === "this"
        ? now.startOf("quarter").plus({ quarters: 1 }).minus({ days: 1 })
        : now.startOf("quarter").minus({ days: 1 });
    return { from: start.toFormat("yyyy-MM-dd"), to: end.toFormat("yyyy-MM-dd") };
  }
  if (timeRange === "annually") {
    const start =
      period === "this"
        ? now.startOf("year")
        : now.startOf("year").minus({ years: 1 });
    const end =
      period === "this"
        ? now.startOf("year").plus({ years: 1 }).minus({ days: 1 })
        : now.startOf("year").minus({ days: 1 });
    return { from: start.toFormat("yyyy-MM-dd"), to: end.toFormat("yyyy-MM-dd") };
  }
  // weekly
  const start =
    period === "this"
      ? now.startOf("week")
      : now.startOf("week").minus({ weeks: 1 });
  const end =
    period === "this"
      ? now.startOf("week").plus({ weeks: 1 }).minus({ days: 1 })
      : now.startOf("week").minus({ days: 1 });
  return { from: start.toFormat("yyyy-MM-dd"), to: end.toFormat("yyyy-MM-dd") };
}

/**
 * Build the WorkTrackerFilters that correspond to a scorecard template + time range + period.
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH.
 * Both the scorecard hooks and the all-work-trackers page template view use this function.
 * If you change what "Driver Pay" means, change it here and both pages update.
 */
export function filtersForWorkTrackerTemplate(
  template: WorkTrackerTemplate,
  timeRange: TimeRange,
  period: "this" | "last" = "this",
  accountManagerUuid?: string | null,
  periodStart?: string | null,
): WorkTrackerFilters {
  const { from, to } = getPeriodDates(timeRange, period, periodStart);

  const base: WorkTrackerFilters = {
    isOpen: true,
    statuses: [],
    dateFrom: null,
    dateTo: null,
    completedFrom: null,
    completedTo: null,
    driverUuid: null,
    accountManagerUuid: accountManagerUuid ?? null,
  };

  switch (template) {
    case "driver-pay":
      return { ...base, dateFrom: from, dateTo: to };
  }
}

/**
 * Build a URL to the all-work-trackers page with template + time range params.
 * Optionally filter by account manager.
 */
export function buildWorkTrackerTemplateUrl(
  template: WorkTrackerTemplate,
  timeRange: TimeRange,
  accountManagerUuid?: string | null,
  periodStart?: string | null,
): string {
  let url = `/all-work-trackers?template=${template}&timeRange=${timeRange}`;
  if (accountManagerUuid) {
    url += `&accountManager=${accountManagerUuid}`;
  }
  if (periodStart) {
    url += `&periodStart=${periodStart}`;
  }
  return url;
}
