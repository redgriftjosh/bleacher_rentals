"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SetTargetsModal, type StatType } from "./SetTargetsModal";
import ReactSpeedometer from "react-d3-speedometer";

const MIN_VALUE = 0;
const MAX_VALUE = 100;

const W = 300;
const H = 300;

const PRIMARY_COLORS = ["#ef4444", "#f97316", "#facc15", "#16a34a", "#16a34a"];

export type Unit = "money" | "number" | "percentage";

export type CompactDetailedStatWithSpeedometerProps = {
  label: string;
  accountManagerUuid?: string | null;
  statType?: StatType;
  historyHref?: string;
  unit?: Unit;
  thisPeriod: {
    current: number;
    goal: number;
  };
  lastPeriod: {
    value: number;
  };
};

export function CompactDetailedStatWithSpeedometer(props: CompactDetailedStatWithSpeedometerProps) {
  const [targetsModalOpen, setTargetsModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const timeRangeParam = searchParams.get("timeRange");
  const canOpenTargets = Boolean(props.accountManagerUuid && props.statType);
  const modalAccountManagerUuid = props.accountManagerUuid ?? undefined;
  const modalStatType = props.statType;

  const periodLabel =
    timeRangeParam === "quarterly" ? "Quarter" : timeRangeParam === "annually" ? "Year" : "Week";

  const unit = props.unit ?? "number";

  const goal = Math.round(props.thisPeriod.goal);
  const minValue = Math.min(
    MIN_VALUE,
    Math.floor(props.thisPeriod.current),
    Math.floor(props.lastPeriod.value),
  );
  const maxValue = Math.max(
    Math.min(Math.round(goal * 1.5), 100),
    Math.ceil(props.thisPeriod.current),
    Math.ceil(props.lastPeriod.value),
  );
  const segmentStops = [
    minValue,
    Math.round(goal * 0.33),
    Math.round(goal * 0.67),
    goal,
    Math.round(goal + (maxValue - goal) / 2),
    maxValue,
  ];
  const speedometerKey = segmentStops.join("-");

  const currentColorIndex = (() => {
    for (let i = 0; i < segmentStops.length - 1; i++) {
      if (props.thisPeriod.current <= segmentStops[i + 1]) {
        return Math.min(i, PRIMARY_COLORS.length - 1);
      }
    }
    return PRIMARY_COLORS.length - 1;
  })();
  const currentColor = PRIMARY_COLORS[currentColorIndex];

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
      return `${Math.round(value)}%`;
    }

    const compactValue = formatCompactRounded(value);

    if (unit === "money") {
      return `$${compactValue}`;
    }

    return compactValue;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
      <div className="flex items-start justify-between">
        <span className="text-2xl font-semibold text-gray-500 -mt-2 mb-4 inline-block">
          {props.label}
        </span>
        <div className="flex items-center gap-2">
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
          {/* {props.historyHref && (
            <Link
              href={props.historyHref}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label={`View ${props.label.toLowerCase()} history`}
              title="View history"
            >
              <History className="h-4 w-4" />
            </Link>
          )} */}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div
            className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold tracking-wide"
            style={{ color: currentColor }}
          >
            {`THIS ${periodLabel.toUpperCase()}`}
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className="text-4xl font-semibold" style={{ color: currentColor }}>
              {formatValue(props.thisPeriod.current)}
            </span>
          </div>
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <span>{formatValue(props.thisPeriod.goal)}</span>
            <Target className="h-4 w-4 -ml-1 text-gray-400" />
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg p-3 pt-4">
          <div className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-gray-400 tracking-wide">
            {`LAST ${periodLabel.toUpperCase()}`}
          </div>
          <div className="flex items-baseline gap-2 -mt-2">
            <span className="text-4xl font-semibold text-gray-400">
              {formatValue(props.lastPeriod.value)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 border border-gray-200 rounded-lg p-3">
        <div className="h-44 flex justify-center">
          <div className="relative overflow-hidden" style={{ width: W, height: 200 }}>
            {/* ── Back layer: last week ghost needle ── */}
            <div className="absolute inset-0">
              <ReactSpeedometer
                key={`back-${speedometerKey}`}
                width={W}
                height={H}
                minValue={minValue}
                maxValue={maxValue}
                value={props.lastPeriod.value}
                customSegmentStops={segmentStops}
                segmentColors={PRIMARY_COLORS}
                needleColor="#9ca3af"
                needleHeightRatio={0.85}
                ringWidth={28}
                maxSegmentLabels={5}
                currentValueText=""
                textColor="#374151"
                labelFontSize="11px"
                valueTextFontSize="0px"
              />
            </div>

            {/* ── Front layer: this week primary needle ── */}
            <div className="absolute inset-0">
              <ReactSpeedometer
                key={`front-${speedometerKey}`}
                width={W}
                height={H}
                minValue={minValue}
                maxValue={maxValue}
                value={props.thisPeriod.current}
                customSegmentStops={segmentStops}
                segmentColors={PRIMARY_COLORS}
                needleColor="#1d4ed8"
                needleHeightRatio={0.9}
                ringWidth={0}
                maxSegmentLabels={6}
                currentValueText={`This week: \${value}%`}
                valueTextFontSize="0px"
                valueTextFontWeight="600"
                labelFontSize="0px"
                textColor="transparent"
              />
            </div>
          </div>
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
