"use client";

import { ANY_TIME_LABEL, type WorkTrackerTimeMode } from "../util";
import {
  normalizeWorkTrackerTime,
  switchWorkTrackerTimeMode,
  toInputTimeValue,
  type WorkTrackerTimeFieldState,
} from "../util/workTrackerTimeField";

type WorkTrackerTimeFieldProps = {
  mode: WorkTrackerTimeMode | null | undefined;
  start: string | null | undefined;
  end: string | null | undefined;
  onChange: (next: WorkTrackerTimeFieldState) => void;
  disabled?: boolean;
};

const MODE_OPTIONS: { value: WorkTrackerTimeMode; label: string }[] = [
  { value: "exact", label: "Exact" },
  { value: "flexible", label: "Flexible" },
  { value: "any_time", label: ANY_TIME_LABEL },
];

const inputClassName = "border rounded p-1.5 text-sm bg-white w-full";

/**
 * Pickup/dropoff time, one of three deliberate states — no timezone, no
 * date: a plain clock reading everyone reads the same regardless of where
 * they are, which is how this has always been communicated in practice.
 *
 * - exact: one time.
 * - flexible: a start/end window.
 * - any_time: unset (start = end = null).
 *
 * See docs/specs/work-tracker-pickup-dropoff-time.md.
 */
export function WorkTrackerTimeField({
  mode,
  start,
  end,
  onChange,
  disabled,
}: WorkTrackerTimeFieldProps) {
  const current: WorkTrackerTimeFieldState = {
    mode: mode ?? "any_time",
    start: start ?? null,
    end: end ?? null,
  };

  const handleModeChange = (nextMode: WorkTrackerTimeMode) => {
    onChange(switchWorkTrackerTimeMode(current, nextMode));
  };

  const handleStartChange = (raw: string) => {
    const normalized = normalizeWorkTrackerTime(raw);
    onChange({
      mode: current.mode,
      start: normalized,
      end: current.mode === "exact" ? normalized : current.end,
    });
  };

  const handleEndChange = (raw: string) => {
    onChange({ ...current, end: normalizeWorkTrackerTime(raw) });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex rounded border overflow-hidden text-xs" role="radiogroup">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={current.mode === option.value}
            disabled={disabled}
            onClick={() => handleModeChange(option.value)}
            className={`flex-1 py-1.5 cursor-pointer disabled:cursor-not-allowed ${
              current.mode === option.value
                ? "bg-darkBlue text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {current.mode === "exact" && (
        <input
          type="time"
          className={inputClassName}
          value={toInputTimeValue(current.start)}
          disabled={disabled}
          onChange={(e) => handleStartChange(e.target.value)}
        />
      )}

      {current.mode === "flexible" && (
        <div className="flex items-center gap-1.5">
          <input
            type="time"
            aria-label="From"
            className={inputClassName}
            value={toInputTimeValue(current.start)}
            disabled={disabled}
            onChange={(e) => handleStartChange(e.target.value)}
          />
          <span className="text-xs text-gray-500 shrink-0">to</span>
          <input
            type="time"
            aria-label="To"
            className={inputClassName}
            value={toInputTimeValue(current.end)}
            disabled={disabled}
            onChange={(e) => handleEndChange(e.target.value)}
          />
        </div>
      )}

      {current.mode === "any_time" && (
        <div className="flex items-center w-full p-1.5 border rounded bg-gray-50 text-sm text-gray-500">
          {ANY_TIME_LABEL}
        </div>
      )}
    </div>
  );
}
