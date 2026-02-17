"use client";

import type { TimeRange } from "@/features/scorecard-one/types";
import { TIME_RANGE_LABELS } from "@/features/scorecard-one/types";

const TIME_RANGES: TimeRange[] = ["weekly", "quarterly", "annually"];

const VIEW_OPTIONS = ["Line", "Bar", "Table"] as const;

type StatHistoryControlsProps = {
  activeRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  compounded: boolean;
  onCompoundedChange: (value: boolean) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export function StatHistoryControls({
  activeRange,
  onRangeChange,
  activeView,
  onViewChange,
  compounded,
  onCompoundedChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: StatHistoryControlsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => onRangeChange(range)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeRange === range
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Compounding</span>
            <button
              onClick={() => onCompoundedChange(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                compounded ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              Compounded
            </button>
            <button
              onClick={() => onCompoundedChange(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !compounded ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              Non-Compounded
            </button>
          </div>

          <div className="flex items-center gap-2">
            {VIEW_OPTIONS.map((view) => (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeView === view
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "bg-gray-100 text-gray-600 hover:text-gray-800"
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-darkBlue focus:border-0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-darkBlue focus:border-0"
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <p className="text-xs text-gray-400">Defaults to all time when empty.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
