"use client";

import { WorkTrackerFilters } from "../types";
import { StatusMultiSelect } from "./filters/StatusMultiSelect";
import { DriverSelect } from "./filters/DriverSelect";
import { AccountManagerSelect } from "./filters/AccountManagerSelect";
import { DateRangeInput } from "@/features/quotesAndBookings/components/filters/DateRangeInput";
import { TimezoneSelect } from "@/features/quotesAndBookings/components/filters/TimezoneSelect";

type FilterPanelProps = {
  filters: WorkTrackerFilters;
  onStatusesChange: (values: string[]) => void;
  onDateRangeChange: (from: string | null, to: string | null) => void;
  onCompletedRangeChange: (from: string | null, to: string | null) => void;
  onDriverChange: (uuid: string | null) => void;
  onAccountManagerChange: (uuid: string | null) => void;
  onClear: () => void;
};

export function FilterPanel({
  filters,
  onStatusesChange,
  onDateRangeChange,
  onCompletedRangeChange,
  onDriverChange,
  onAccountManagerChange,
  onClear,
}: FilterPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Status</div>
            <StatusMultiSelect values={filters.statuses} onChange={onStatusesChange} />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Work Date</div>
            <DateRangeInput
              label="Date"
              from={filters.dateFrom}
              to={filters.dateTo}
              onChange={onDateRangeChange}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Completed</div>
            <DateRangeInput
              label="Completed"
              from={filters.completedFrom}
              to={filters.completedTo}
              onChange={onCompletedRangeChange}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Account Manager</div>
            <AccountManagerSelect
              selectedAccountManagerUuid={filters.accountManagerUuid}
              onChange={onAccountManagerChange}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Driver</div>
            <DriverSelect
              selectedDriverUuid={filters.driverUuid}
              onChange={onDriverChange}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Timezone</div>
            <TimezoneSelect />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-4 border-t">
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
