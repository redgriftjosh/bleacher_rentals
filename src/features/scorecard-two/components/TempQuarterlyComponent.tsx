"use client";

import { useState } from "react";
import { Flag, History, Target } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip as RechartsTooltip } from "recharts";

type ChartDataPoint = {
  day: string;
  dayLabel: string;
  thisPeriod: number | null;
  lastPeriod: number;
  pace: number;
};

type Unit = "money" | "number" | "percentage";

type CompactDetailedStatWithGraphProps = {
  label: string;
  accountManagerUuid?: string;
  statType?: string;
  historyHref?: string;
  unit?: Unit;
  thisPeriod: {
    current: number;
    goal: number;
    paceTarget: number;
  };
  lastPeriod: {
    currentAtSameDay: number;
    totalAtEnd: number;
  };
  chartData: ChartDataPoint[];
};

export function TempCompactDetailedStatWithGraph(props: CompactDetailedStatWithGraphProps) {
  const [targetsModalOpen, setTargetsModalOpen] = useState(false);

  const unit = props.unit ?? "number";

  const formatCompactRounded = (value: number) => {
    const rounded = Math.round(value);
    const absValue = Math.abs(rounded);

    if (absValue < 1_000) {
      return `${rounded}`;
    }

    if (absValue < 10_000) {
      return `${(rounded / 1_000).toFixed(1)}k`;
    }

    if (absValue < 1_000_000) {
      return `${Math.round(rounded / 1_000)}k`;
    }

    if (absValue < 10_000_000) {
      return `${(rounded / 1_000_000).toFixed(1)}m`;
    }

    return `${Math.round(rounded / 1_000_000)}m`;
  };

  const formatValue = (value: number) => {
    if (unit === "percentage") {
      return value;
    }

    const compactValue = formatCompactRounded(value);

    if (unit === "money") {
      return `$${compactValue}`;
    }

    return compactValue;
  };

  // Calculate pace status
  const paceDelta = props.thisPeriod.paceTarget - props.thisPeriod.current;
  const paceStatus = paceDelta <= 0 ? "good" : paceDelta <= 5 ? "warn" : "bad";

  const paceColor =
    paceStatus === "good"
      ? "text-green-600"
      : paceStatus === "warn"
        ? "text-amber-500"
        : "text-red-600";

  // Calculate max values for chart scaling
  const thisPeriodValues = props.chartData
    .map((p) => p.thisPeriod)
    .filter((value): value is number => typeof value === "number");
  const maxThisPeriod = thisPeriodValues.length > 0 ? Math.max(...thisPeriodValues) : 0;
  const maxLastPeriod = Math.max(...props.chartData.map((p) => p.lastPeriod));
  const maxYAxis = Math.max(props.thisPeriod.goal, maxThisPeriod, maxLastPeriod);

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
            <span className="text-4xl font-semibold text-green-600">
              {formatValue(props.thisPeriod.current)}
            </span>
            <span className="text-sm font-medium text-gray-400">
              / {formatValue(props.thisPeriod.paceTarget)}
            </span>
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{formatValue(props.thisPeriod.goal)}</span>
            <Target className="h-4 w-4 -ml-1 text-gray-400" />
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-gray-400 tracking-wide">
            LAST PERIOD
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className="text-4xl font-semibold text-gray-400">
              {formatValue(props.lastPeriod.currentAtSameDay)}
            </span>
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{formatValue(props.lastPeriod.totalAtEnd)}</span>
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
                tickFormatter={(value) => {
                  const raw = String(value);
                  const [month, day] = raw.split("/").map(Number);

                  if (!month || !day || day !== 1) {
                    return "";
                  }

                  const monthLabels: Record<number, string> = {
                    1: "Jan",
                    2: "Feb",
                    3: "Mar",
                    4: "Apr",
                    5: "May",
                    6: "Jun",
                    7: "Jul",
                    8: "Aug",
                    9: "Sep",
                    10: "Oct",
                    11: "Nov",
                    12: "Dec",
                  };

                  return monthLabels[month] ?? "";
                }}
              />
              <RechartsTooltip
                formatter={(value, name) => {
                  const numericValue = typeof value === "number" ? value : 0;
                  const formattedValue = formatValue(numericValue);
                  if (name === "pace") return [formattedValue, "Pace"];
                  if (name === "lastPeriod") return [formattedValue, "Last period"];
                  return [formattedValue, "This period"];
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
                dataKey="lastPeriod"
                stroke="#9CA3AF"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="thisPeriod"
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
