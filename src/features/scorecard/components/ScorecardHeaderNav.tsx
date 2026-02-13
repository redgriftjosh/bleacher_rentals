"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TimeRange } from "@/features/scorecard/types";
import { RotateCw } from "lucide-react";

const RANGE_LABELS: Record<TimeRange, string> = {
  weekly: "This Week",
  quarterly: "This Quarter",
  annually: "This Year",
};

const DATA_TYPES = [
  "all",
  "quotes-sent",
  "quotes-signed",
  "value-of-quotes-signed",
  "revenue",
] as const;

type DataType = (typeof DATA_TYPES)[number];

const DATA_TYPE_LABELS: Record<DataType, string> = {
  all: "Overview",
  "quotes-sent": "Quotes Sent",
  "quotes-signed": "Quotes Signed",
  "value-of-quotes-signed": "Value of Quotes Signed",
  revenue: "Revenue",
};

type ManagerOption = {
  id: string;
  name: string;
};

type ScorecardHeaderNavProps = {
  managers: ManagerOption[];
};

function parseRange(value: string | null): TimeRange {
  if (value === "quarterly" || value === "annually" || value === "weekly") {
    return value;
  }
  return "weekly";
}

function parseDataType(value: string | null): DataType {
  if (value && DATA_TYPES.includes(value as DataType)) {
    return value as DataType;
  }
  return "all";
}

export function ScorecardHeaderNav({ managers }: ScorecardHeaderNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRange = parseRange(searchParams.get("timeRange"));
  const activeType = parseDataType(searchParams.get("dataType"));
  const activeManagerId = searchParams.get("accountManager") ?? "all";
  const managerName =
    activeManagerId === "all"
      ? "Team Data"
      : (managers.find((manager) => manager.id === activeManagerId)?.name ?? "Team Data");
  const [isRangeAnimating, setIsRangeAnimating] = useState(false);

  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="text-5xl text-darkBlue font-bold">{DATA_TYPE_LABELS[activeType]}</div>
        <div className="text-2xl text-gray-500 font-medium">{managerName}</div>
      </div>
      <button
        onClick={() => {
          const ranges: TimeRange[] = ["weekly", "quarterly", "annually"];
          const currentIndex = ranges.indexOf(activeRange);
          const nextIndex = (currentIndex + 1) % ranges.length;
          const nextRange = ranges[nextIndex];
          const params = new URLSearchParams(searchParams.toString());
          params.set("timeRange", nextRange);
          if (!params.get("dataType")) params.set("dataType", "all");
          if (!params.get("accountManager")) params.set("accountManager", "all");
          router.replace(`/scorecard?${params.toString()}`);
          setIsRangeAnimating(true);
          window.setTimeout(() => setIsRangeAnimating(false), 220);
        }}
        className="group text-3xl text-darkBlue font-bold border-2 border-gray-300 rounded-lg p-2 flex items-center gap-2 bg-white hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
      >
        <span
          className={`transition-all duration-200 ${
            isRangeAnimating ? "opacity-60 translate-y-0.5" : "opacity-100 translate-y-0"
          }`}
        >
          {RANGE_LABELS[activeRange]}
        </span>
        <RotateCw className="w-5 h-5 transition-transform duration-200 group-hover:rotate-180" />
      </button>
    </div>
  );
}
