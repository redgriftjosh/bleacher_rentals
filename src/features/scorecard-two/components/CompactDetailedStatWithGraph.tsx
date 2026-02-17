"use client";

import { useState } from "react";
import { Flag, History, Target } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip as RechartsTooltip } from "recharts";

type ChartDataPoint = {
  day: string;
  dayLabel: string;
  thisWeek: number | null;
  lastWeek: number;
  pace: number;
};

type CompactDetailedStatWithGraphProps = {
  label: string;
  accountManagerUuid?: string;
  statType?: string;
  historyHref?: string;
  thisWeek: {
    current: number;
    goal: number;
    paceTarget: number;
  };
  lastWeek: {
    currentAtSameDay: number;
    totalAtEnd: number;
  };
  chartData: ChartDataPoint[];
};

export function CompactDetailedStatWithGraph(props: CompactDetailedStatWithGraphProps) {
  const [targetsModalOpen, setTargetsModalOpen] = useState(false);

  // Calculate pace status
  const paceDelta = props.thisWeek.paceTarget - props.thisWeek.current;
  const paceStatus = paceDelta <= 0 ? "good" : paceDelta <= 5 ? "warn" : "bad";

  const paceColor =
    paceStatus === "good"
      ? "text-green-600"
      : paceStatus === "warn"
        ? "text-amber-500"
        : "text-red-600";

  // Calculate max values for chart scaling
  const thisWeekValues = props.chartData
    .map((p) => p.thisWeek)
    .filter((value): value is number => typeof value === "number");
  const maxThisWeek = thisWeekValues.length > 0 ? Math.max(...thisWeekValues) : 0;
  const maxLastWeek = Math.max(...props.chartData.map((p) => p.lastWeek));
  const maxYAxis = Math.max(props.thisWeek.goal, maxThisWeek, maxLastWeek);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
      <div className="flex items-start justify-between">
        <span className="text-2xl font-semibold text-gray-500 -mt-2 mb-4 inline-block">
          {props.label}
        </span>
        <div className="flex items-center gap-2">
          {props.accountManagerUuid && (
            <button
              onClick={() => setTargetsModalOpen(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition"
              title="Set targets"
            >
              <Target className="h-4 w-4" />
              <span>Set targets</span>
            </button>
          )}
          {props.historyHref && (
            <Link
              href={props.historyHref}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label={`View ${props.label.toLowerCase()} history`}
              title="View history"
            >
              <History className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-green-600 tracking-wide">
            THIS WEEK
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className="text-4xl font-semibold text-green-600">{props.thisWeek.current}</span>
            <span className="text-sm font-medium text-gray-400">/ {props.thisWeek.paceTarget}</span>
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{props.thisWeek.goal}</span>
            <Target className="h-4 w-4 -ml-1 text-gray-400" />
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-gray-400 tracking-wide">
            LAST WEEK
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className="text-4xl font-semibold text-gray-400">
              {props.lastWeek.currentAtSameDay}
            </span>
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{props.lastWeek.totalAtEnd}</span>
            <Flag className="h-4 w-4 -ml-1 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="mt-4 border border-gray-200 rounded-lg p-3">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={props.chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                stroke="#9CA3AF"
                axisLine={false}
                tickLine={false}
                interval={0}
                padding={{ left: 8, right: 8 }}
                tickMargin={6}
              />
              <RechartsTooltip
                formatter={(value, name) => {
                  const numericValue = typeof value === "number" ? value : 0;
                  if (name === "pace") return [numericValue, "Pace"];
                  if (name === "lastWeek") return [numericValue, "Last week"];
                  return [numericValue, "This week"];
                }}
                labelFormatter={(_, payload) => {
                  const dayLabel = payload?.[0]?.payload?.dayLabel;
                  return dayLabel ?? "";
                }}
                contentStyle={{
                  fontSize: "12px",
                  padding: "6px 8px",
                  borderRadius: "8px",
                  borderColor: "#E5E7EB",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                itemStyle={{ padding: 0, margin: 0 }}
                labelStyle={{ marginBottom: 4, fontWeight: 600, color: "#111827" }}
              />
              <Line
                type="monotone"
                dataKey="pace"
                stroke="#F97316"
                strokeDasharray="6 6"
                strokeWidth={1}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lastWeek"
                stroke="#9CA3AF"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="thisWeek"
                stroke={
                  paceStatus === "good" ? "#16A34A" : paceStatus === "warn" ? "#F59E0B" : "#DC2626"
                }
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* {props.accountManagerUuid && props.statType && (
        <SetTargetsModal
          open={targetsModalOpen}
          onOpenChange={setTargetsModalOpen}
          accountManagerUuid={props.accountManagerUuid}
          statType={props.statType}
        />
      )} */}
    </div>
  );
}
