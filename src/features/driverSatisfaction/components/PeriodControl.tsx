"use client";

import type { Granularity } from "../utils/aggregate";
import type { PeriodPreset, PeriodSelection } from "../utils/period";

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "1w", label: "Last week" },
  { value: "1m", label: "Last month" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range…" },
];

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

type PeriodControlProps = {
  value: PeriodSelection;
  onChange: (period: PeriodSelection) => void;
};

const CONTROL_CLASS =
  "border border-gray-300 rounded-lg px-3 py-2 bg-white text-darkBlue font-semibold";

/**
 * The page-wide period: which answers count, and how wide one point on the
 * trend line is.
 *
 * Range and granularity are separate on purpose. "Last 12 months, weekly" is a
 * legitimate thing to want to look at, and folding the two into a single list
 * ("Weekly / Monthly / Quarterly") would quietly decide the range on the
 * reader's behalf.
 */
export default function PeriodControl({ value, onChange }: PeriodControlProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={value.preset}
        onChange={(event) => onChange({ ...value, preset: event.target.value as PeriodPreset })}
        className={CONTROL_CLASS}
        aria-label="Period"
      >
        {PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      {value.preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.from ?? ""}
            max={value.to ?? undefined}
            onChange={(event) => onChange({ ...value, from: event.target.value || null })}
            className={CONTROL_CLASS}
            aria-label="From date"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={value.to ?? ""}
            min={value.from ?? undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value || null })}
            className={CONTROL_CLASS}
            aria-label="To date"
          />
        </div>
      )}

      <select
        value={value.granularity}
        onChange={(event) => onChange({ ...value, granularity: event.target.value as Granularity })}
        className={CONTROL_CLASS}
        aria-label="Trend granularity"
      >
        {GRANULARITIES.map((granularity) => (
          <option key={granularity.value} value={granularity.value}>
            {granularity.label}
          </option>
        ))}
      </select>
    </div>
  );
}
