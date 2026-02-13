"use client";

import { QuotesBookingsFilters } from "../types";
import { StatusMultiSelect } from "./filters/StatusMultiSelect";
import { DateRangeInput } from "./filters/DateRangeInput";
import { AccountManagerMultiSelect } from "./filters/AccountManagerMultiSelect";

type FilterPanelProps = {
  filters: QuotesBookingsFilters;
  onStatusesChange: (values: string[]) => void;
  onCreatedRangeChange: (from: string | null, to: string | null) => void;
  onEventRangeChange: (from: string | null, to: string | null) => void;
  onAccountManagerChange: (uuid: string | null) => void;
  onClear: () => void;
};

export function FilterPanel({
  filters,
  onStatusesChange,
  onCreatedRangeChange,
  onEventRangeChange,
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
            <div className="text-sm font-semibold text-gray-800 mb-2">Created At</div>
            <DateRangeInput
              label="Created"
              from={filters.createdFrom}
              to={filters.createdTo}
              onChange={onCreatedRangeChange}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Event Date</div>
            <DateRangeInput
              label="Event"
              from={filters.eventFrom}
              to={filters.eventTo}
              onChange={onEventRangeChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Events are included if their date range overlaps the selected range.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Account Manager</div>
            <AccountManagerMultiSelect
              selectedUserUuid={filters.accountManagerUserUuid}
              onChange={onAccountManagerChange}
            />
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
