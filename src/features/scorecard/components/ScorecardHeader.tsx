"use client";

import TimeRangeToggle from "./TimeRangeToggle";
import PeriodSelect from "./PeriodSelect";

export function ScorecardHeader() {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="text-5xl text-darkBlue font-bold">Overview</div>
        <div className="text-2xl text-gray-500 font-medium">Team Data</div>
      </div>
      <div className="flex items-center gap-3">
        <PeriodSelect />
        <TimeRangeToggle />
      </div>
    </div>
  );
}
