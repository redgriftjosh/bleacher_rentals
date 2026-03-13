"use client";

import { useMemo } from "react";
import { DateTime } from "luxon";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { Dropdown } from "@/components/DropDown";
import { sql } from "@powersync/kysely-driver";

type YearData = {
  year: number;
};

type Props = {
  selectedView: "current" | number;
  onViewChange: (view: "current" | number) => void;
};

export function WeeksNav({ selectedView, onViewChange }: Props) {
  // Query to get all unique years that have work tracker groups
  const query = useMemo(() => {
    return db
      .selectFrom("WorkTrackerGroups")
      .select([sql<number>`cast(strftime('%Y', week_start) as integer)`.as("year")])
      .groupBy("year")
      .orderBy("year", "desc")
      .compile();
  }, []);

  const { data } = useTypedQuery(query, expect<YearData>());

  const availableYears = useMemo(() => {
    if (!data) return [];
    return data.map((row) => row.year).filter((year) => year !== null);
  }, [data]);

  const options = [
    { label: "Current Work Trackers", value: "current" as const },
    ...availableYears.map((year) => ({ label: year.toString(), value: year })),
  ];

  const currentValue = selectedView === "current" ? "current" : selectedView;
  const selectedLabel =
    selectedView === "current" ? "Current Work Trackers" : selectedView.toString();

  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm font-medium text-gray-700">View:</span>
      <Dropdown
        options={options}
        selected={currentValue}
        onSelect={(value) => onViewChange(value as "current" | number)}
        placeholder="Select view"
        className="w-[200px]"
      />
    </div>
  );
}
