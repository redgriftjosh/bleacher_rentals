"use client";

import { useState } from "react";
import { ExternalLink, Flag, History, Target } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip as RechartsTooltip } from "recharts";
import { useSearchParams } from "next/navigation";
import { SetTargetsModal, type StatType } from "./SetTargetsModal";
import { useTeamPermissions } from "@/features/manageTeam/hooks/useTeamPermissions";
import { canEditTargets } from "../util/canEditTargets";
import { formatCompactRounded, formatValue, type FormatUnit } from "@/utils/formatters";
import { getPaceStatus, PACE_TEXT_COLOR, PACE_HEX } from "../util/paceStatus";

type ChartDataPoint = {
  day: string;
  dayTick?: string;
  dayLabel: string;
  thisPeriod: number | null;
  lastPeriod: number;
  pace: number;
};

type CompactDetailedStatWithGraphProps = {
  label: string;
  accountManagerUuid?: string | null;
  statType?: StatType;
  historyHref?: string;
  seeDataHref?: string;
  unit?: FormatUnit;
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

export function CompactDetailedStatWithGraph(props: CompactDetailedStatWithGraphProps) {
  const [targetsModalOpen, setTargetsModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const { isAdmin } = useTeamPermissions();
  const canOpenTargets = canEditTargets(isAdmin, props.accountManagerUuid, props.statType);
  const modalAccountManagerUuid = props.accountManagerUuid ?? undefined;
  const modalStatType = props.statType;

  const periodLabel =
    timeRangeParam === "quarterly" ? "Quarter" : timeRangeParam === "annually" ? "Year" : "Week";

  const unit = props.unit ?? "number";

  const paceStatus = getPaceStatus(props.thisPeriod.current, props.thisPeriod.paceTarget);
  const paceTextColor = PACE_TEXT_COLOR[paceStatus];
  const paceHex = PACE_HEX[paceStatus];

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
          {props.seeDataHref && (
            <Link
              href={props.seeDataHref}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition"
              title="See the data behind this number"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">See data</span>
            </Link>
          )}
          {canOpenTargets && (
            <button
              onClick={() => setTargetsModalOpen(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition cursor-pointer"
              title="Set targets"
            >
              <Target className="h-4 w-4" />
              <span className="whitespace-nowrap">Set targets</span>
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div className={`absolute -top-2 left-3 bg-white px-2 text-xs font-semibold ${paceTextColor} tracking-wide`}>
            {`THIS ${periodLabel.toUpperCase()}`}
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className={`text-4xl font-semibold ${paceTextColor}`}>
              {formatValue(props.thisPeriod.current, unit)}
            </span>
            <span className="text-sm font-medium text-gray-400">
              / {formatValue(props.thisPeriod.paceTarget, unit)}
            </span>
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{formatValue(props.thisPeriod.goal, unit)}</span>
            <Target className="h-4 w-4 -ml-1 text-gray-400" />
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-gray-400 tracking-wide">
            {`LAST ${periodLabel.toUpperCase()}`}
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className="text-4xl font-semibold text-gray-400">
              {formatValue(props.lastPeriod.currentAtSameDay, unit)}
            </span>
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{formatValue(props.lastPeriod.totalAtEnd, unit)}</span>
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
                tickFormatter={(_value, index) => props.chartData[index]?.dayTick ?? ""}
                tick={{ fontSize: 11 }}
                stroke="#9CA3AF"
                axisLine={false}
                tickLine={false}
                interval={0}
                padding={{ left: 8, right: 8 }}
                tickMargin={6}
              />
              <RechartsTooltip
                itemSorter={(item) => {
                  const key = String(item.dataKey ?? item.name ?? "");
                  if (key === "thisPeriod") return 0;
                  if (key === "lastPeriod") return 1;
                  if (key === "pace") return 2;
                  return 99;
                }}
                formatter={(value, name) => {
                  const numericValue = typeof value === "number" ? value : 0;
                  const formattedValue = formatValue(numericValue, unit);
                  if (name === "pace") return [formattedValue, "Pace"];
                  if (name === "lastPeriod") return [formattedValue, `Last ${periodLabel}`];
                  return [formattedValue, `This ${periodLabel}`];
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
                stroke={paceHex}
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {canOpenTargets && modalAccountManagerUuid && modalStatType && (
        <SetTargetsModal
          open={targetsModalOpen}
          onOpenChange={setTargetsModalOpen}
          accountManagerUuid={modalAccountManagerUuid}
          statType={modalStatType}
        />
      )}
    </div>
  );
}
