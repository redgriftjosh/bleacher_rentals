"use client";

import { SCORE_DENOMINATOR } from "../utils/formatScore";
import type { ScoreFilter, ScoreFilterMode } from "../utils/scoreFilter";

const MODES: { value: ScoreFilterMode; label: string }[] = [
  { value: "all", label: "All scores" },
  { value: "at_or_below", label: "and below" },
  { value: "at_or_above", label: "and above" },
];

const SCORES = Array.from({ length: SCORE_DENOMINATOR }, (_, i) => i + 1);

type ScoreFilterControlProps = {
  value: ScoreFilter;
  onChange: (filter: ScoreFilter) => void;
};

/**
 * Three modes and a number, rather than one dropdown of every useful band.
 *
 * "6 and below", "5 and below", "5 and above" and the rest are the same two
 * questions asked at different thresholds; enumerating them makes a twenty-item
 * list that still misses the threshold somebody wants. The number picker
 * appears only once a direction is chosen, so the default state stays one
 * control.
 */
export default function ScoreFilterControl({ value, onChange }: ScoreFilterControlProps) {
  const selectClass =
    "border border-gray-300 rounded-lg px-3 py-2 bg-white text-darkBlue font-semibold";

  return (
    <div className="flex gap-2">
      {value.mode !== "all" && (
        <select
          value={value.score}
          onChange={(event) => onChange({ ...value, score: Number(event.target.value) })}
          className={selectClass}
          aria-label="Score threshold"
        >
          {SCORES.map((score) => (
            <option key={score} value={score}>
              {score}/{SCORE_DENOMINATOR}
            </option>
          ))}
        </select>
      )}

      <select
        value={value.mode}
        onChange={(event) => onChange({ ...value, mode: event.target.value as ScoreFilterMode })}
        className={selectClass}
        aria-label="Score filter"
      >
        {MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
    </div>
  );
}
