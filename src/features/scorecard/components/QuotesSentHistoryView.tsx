"use client";

import { useState } from "react";
import type { TimeRange } from "@/features/scorecard/types";
import { StatHistoryHeader } from "@/features/scorecard/components/history/StatHistoryHeader";
import { StatHistoryControls } from "@/features/scorecard/components/history/StatHistoryControls";
import { StatHistoryChart } from "@/features/scorecard/components/history/StatHistoryChart";
import { StatHistoryNavBar } from "@/features/scorecard/components/history/StatHistoryNavBar";

const HISTORY_POINTS = [
  { label: "Wk 1", value: 24 },
  { label: "Wk 2", value: 31 },
  { label: "Wk 3", value: 38 },
  { label: "Wk 4", value: 42 },
  { label: "Wk 5", value: 36 },
  { label: "Wk 6", value: 48 },
  { label: "Wk 7", value: 52 },
  { label: "Wk 8", value: 46 },
  { label: "Wk 9", value: 58 },
  { label: "Wk 10", value: 63 },
  { label: "Wk 11", value: 57 },
  { label: "Wk 12", value: 69 },
];

export function QuotesSentHistoryView() {
  const [activeRange, setActiveRange] = useState<TimeRange>("weekly");
  const [activeStat, setActiveStat] = useState("Quotes Sent");
  const [activeView, setActiveView] = useState("Line");
  const [compounded, setCompounded] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <div className="space-y-6">
      <StatHistoryNavBar activeStat={activeStat} onStatChange={setActiveStat} />

      <div className="flex flex-col gap-2">
        <StatHistoryHeader
          title="Quotes Sent History"
          subtitle="Placeholder data • One point per week"
        />
      </div>

      <StatHistoryControls
        activeRange={activeRange}
        onRangeChange={setActiveRange}
        activeView={activeView}
        onViewChange={setActiveView}
        compounded={compounded}
        onCompoundedChange={setCompounded}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <StatHistoryChart data={HISTORY_POINTS} metricLabel={activeStat} activeView={activeView} />
    </div>
  );
}
