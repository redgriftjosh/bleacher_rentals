"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { getPeriodOptions } from "../util/periodDates";
import { TimeRange, validTimeRanges } from "../hooks/queries/useEventsWithinTimeRange";

export default function PeriodSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const activeRange: TimeRange = validTimeRanges.includes(timeRangeParam as TimeRange)
    ? (timeRangeParam as TimeRange)
    : "weekly";
  const periodStart = searchParams.get("periodStart");

  const options = useMemo(() => getPeriodOptions(activeRange, 12), [activeRange]);

  // Current selection label — default to first option (current period)
  const currentLabel = options.find((o) => o.value === periodStart)?.label ?? options[0]?.label ?? "";

  return (
    <div className="relative inline-block">
      <select
        value={periodStart ?? options[0]?.value ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          const selected = e.target.value;
          // If selecting current period (first option), remove param to keep URL clean
          if (selected === options[0]?.value) {
            params.delete("periodStart");
          } else {
            params.set("periodStart", selected);
          }
          router.replace(`?${params.toString()}`);
        }}
        className="appearance-none text-sm text-darkBlue font-medium border border-gray-300 rounded-lg py-2 pl-3 pr-8 bg-white hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  );
}
