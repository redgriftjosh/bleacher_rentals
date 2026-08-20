"use client";

import CentsInput from "@/components/CentsInput";
import { AppTooltip } from "@/components/AppTooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  fromDriverPaySegments,
  moveDriverPayCutoff,
  removeDriverPayCutoff,
  setDriverPaySegmentRate,
  splitDriverPaySegment,
  toDriverPaySegments,
  validateDriverPayCutoff,
  type DriverPayRange,
  type DriverPaySegment,
} from "@/features/manageTeam/logic/driverPayRanges";
import { Trash2 } from "lucide-react";
import { useState } from "react";

const numberInputClass =
  "w-full rounded border px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0";

function formatRate(cents: number | null, unit: string): string {
  return cents === null ? "Set rate" : `$${(cents / 100).toFixed(2)}/${unit}`;
}

function centsToDisplay(cents: number | null): string {
  return cents !== null ? (cents / 100).toFixed(2) : "";
}

/** Asks for the cutoff that splits a segment in two. */
function AddCutoffPopover({
  segments,
  segmentIndex,
  unit,
  onAdd,
}: {
  segments: DriverPaySegment[];
  segmentIndex: number;
  unit: string;
  onAdd: (cutoff: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = value === "" ? null : parseInt(value, 10);
    const problem = validateDriverPayCutoff(segments, segmentIndex, parsed);
    if (problem) {
      setError(problem);
      return;
    }
    onAdd(parsed!);
    setOpen(false);
    setValue("");
    setError(null);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setValue("");
          setError(null);
        }
      }}
    >
      <AppTooltip content="Add range">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Add range"
            className="group flex h-6 w-full items-center px-1"
          >
            <span className="h-0.5 w-full rounded bg-gray-300 transition-colors group-hover:bg-greenAccent" />
          </button>
        </PopoverTrigger>
      </AppTooltip>

      <PopoverContent className="w-64 space-y-2">
        <p className="text-sm font-medium text-gray-800">Add a cutoff</p>
        <p className="text-xs text-gray-500">
          Splits this range in two at the value you enter, in {unit}.
        </p>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className={numberInputClass}
          placeholder={`Cutoff in ${unit}`}
          aria-label={`Cutoff in ${unit}`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          onClick={submit}
          className="w-full rounded bg-darkBlue px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Add Range
        </button>
      </PopoverContent>
    </Popover>
  );
}

/** Edits (or clears) one segment's rate. */
function EditRatePopover({
  rateCents,
  unit,
  currency,
  onChange,
}: {
  rateCents: number | null;
  unit: string;
  currency: string;
  onChange: (rateCents: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() => centsToDisplay(rateCents));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reopening always starts from what is stored, not from a stale keystroke.
        if (next) setDisplay(centsToDisplay(rateCents));
      }}
    >
      <AppTooltip content="Edit value">
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`rounded px-2 py-0.5 text-sm font-semibold hover:bg-gray-100 ${
              rateCents === null ? "text-red-600" : "text-gray-800"
            }`}
          >
            {formatRate(rateCents, unit)}
          </button>
        </PopoverTrigger>
      </AppTooltip>

      <PopoverContent
        className="w-56 space-y-2"
        // The rate applies as it is typed, so Enter has nothing to submit — it just closes.
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <p className="text-sm font-medium text-gray-800">Rate ({currency})</p>
        <CentsInput
          value={display}
          onChange={(nextDisplay, cents) => {
            setDisplay(nextDisplay);
            onChange(cents);
          }}
          placeholder="0.00"
          className={numberInputClass}
          ariaLabel={`Rate per ${unit}`}
        />
        <p className="text-xs text-gray-500">Paid per {unit} inside this range.</p>
      </PopoverContent>
    </Popover>
  );
}

/** Moves or deletes one cutoff. */
function EditCutoffPopover({
  segments,
  cutoffIndex,
  unit,
  onMove,
  onRemove,
}: {
  segments: DriverPaySegment[];
  cutoffIndex: number;
  unit: string;
  onMove: (cutoff: number) => void;
  onRemove: () => void;
}) {
  const cutoff = segments[cutoffIndex].to!;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(cutoff));
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = value === "" ? null : parseInt(value, 10);
    const problem = validateDriverPayCutoff(segments, cutoffIndex, parsed);
    if (problem) {
      setError(problem);
      return;
    }
    onMove(parsed!);
    setOpen(false);
    setError(null);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValue(String(cutoff));
          setError(null);
        }
      }}
    >
      <AppTooltip content="Edit range">
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded px-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            {cutoff}
            {unit}
          </button>
        </PopoverTrigger>
      </AppTooltip>

      <PopoverContent className="w-64 space-y-2">
        <p className="text-sm font-medium text-gray-800">Cutoff ({unit})</p>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className={numberInputClass}
          aria-label={`Cutoff in ${unit}`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            className="flex-1 rounded bg-darkBlue px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
            className="flex items-center gap-1 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type DriverPayTrackProps = {
  payRateCents: number | null;
  payRanges: DriverPayRange[];
  onChange: (next: { payRateCents: number | null; payRanges: DriverPayRange[] }) => void;
  /** The driver's pay unit — cutoffs are measured in it. */
  unit: "KM" | "MI" | "HR";
  currency: "CAD" | "USD";
};

/**
 * The driver's pay rate drawn as one unbroken line from 0 to ∞, cut into ranges.
 *
 * The end nodes are fixed (0 and ∞) and the ones between them are the cutoffs. Clicking a
 * segment adds a cutoff, clicking a rate edits it, clicking a cutoff moves or removes it.
 * Nothing drags: the nodes are spaced evenly regardless of the values, so the line reads
 * as a list of ranges rather than a scale. A driver with no ranges is a single segment
 * showing the flat pay rate.
 */
export function DriverPayTrack({
  payRateCents,
  payRanges,
  onChange,
  unit,
  currency,
}: DriverPayTrackProps) {
  const segments = toDriverPaySegments(payRateCents, payRanges);
  const apply = (next: DriverPaySegment[]) => onChange(fromDriverPaySegments(next));

  // [node] [segment] [node] … [node]: cutoffs sit on the nodes, rates over the segments.
  const gridTemplateColumns = `auto ${segments.map(() => "minmax(7rem, 1fr) auto").join(" ")}`;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label className="block text-sm font-medium text-gray-700">Pay Rate</label>
        <p className="text-xs text-gray-500">
          Click the line to split it into ranges, or a rate to change it.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white px-3 pb-3 pt-2">
        <div className="grid items-center gap-x-1" style={{ gridTemplateColumns }}>
          {/* Row 1 — labels: end points and cutoffs over the nodes, rates over the segments. */}
          <span className="justify-self-center whitespace-nowrap text-xs font-medium text-gray-700">
            0{unit}
          </span>
          {segments.map((segment, index) => (
            <span key={`label-${segment.id}`} className="contents">
              <span className="justify-self-center">
                <EditRatePopover
                  rateCents={segment.rateCents}
                  unit={unit}
                  currency={currency}
                  onChange={(rateCents) =>
                    apply(setDriverPaySegmentRate(segments, index, rateCents))
                  }
                />
              </span>
              <span className="justify-self-center whitespace-nowrap">
                {segment.to === null ? (
                  <span className="px-1 text-xs font-medium text-gray-700">∞{unit}</span>
                ) : (
                  <EditCutoffPopover
                    segments={segments}
                    cutoffIndex={index}
                    unit={unit}
                    onMove={(cutoff) => apply(moveDriverPayCutoff(segments, index, cutoff))}
                    onRemove={() => apply(removeDriverPayCutoff(segments, index))}
                  />
                )}
              </span>
            </span>
          ))}

          {/* Row 2 — the line itself: a dot per node, a clickable rule per segment. */}
          <span className="h-3 w-3 justify-self-center rounded-full border-2 border-gray-400 bg-white" />
          {segments.map((segment, index) => (
            <span key={`track-${segment.id}`} className="contents">
              <AddCutoffPopover
                segments={segments}
                segmentIndex={index}
                unit={unit}
                onAdd={(cutoff) => apply(splitDriverPaySegment(segments, index, cutoff))}
              />
              <span
                className={`h-3 w-3 justify-self-center rounded-full border-2 bg-white ${
                  segment.to === null ? "border-gray-400" : "border-darkBlue"
                }`}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
