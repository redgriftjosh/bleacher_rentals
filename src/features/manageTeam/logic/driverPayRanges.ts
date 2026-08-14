/**
 * Tiered driver pay (DriverPayRanges).
 *
 * A range covers `[minValue, maxValue)` — min inclusive, max exclusive — measured in the
 * driver's own pay unit (KM / MI / HR). `maxValue: null` is the open-ended top tier.
 *
 * The flat `Drivers.pay_rate_cents` stays the fallback: a matching range's rate wins, and
 * the flat rate covers drivers with no ranges (or values outside every range).
 *
 * Rates are held in cents in the form (same as `payRateCents`, so `CentsInput` works
 * unchanged) and converted to the `DriverPayRanges.rate` numeric(10,2) at the DB boundary.
 */
export type DriverPayRange = {
  /** `DriverPayRanges.id` for saved rows, a client-side uuid for rows not saved yet. */
  id: string;
  minValue: number | null;
  /** null = open-ended top tier */
  maxValue: number | null;
  rateCents: number | null;
};

export type DriverPayRangeError = {
  /** Index into the ranges array the message belongs to. */
  index: number;
  message: string;
};

export type DriverPayRangeGap = { from: number; to: number };

/** A row the user has filled in far enough to save and to reason about. */
type CompleteDriverPayRange = DriverPayRange & { minValue: number; rateCents: number };

function isComplete(range: DriverPayRange): range is CompleteDriverPayRange {
  return range.minValue !== null && range.rateCents !== null;
}

function upperBound(range: DriverPayRange): number {
  return range.maxValue ?? Number.POSITIVE_INFINITY;
}

/**
 * Everything that would make the tiers unsaveable or ambiguous. Mirrors the
 * DriverPayRanges check constraints (min >= 0, rate >= 0, max > min) and adds the
 * overlap rule, which the DB cannot express.
 */
export function validateDriverPayRanges(ranges: DriverPayRange[]): DriverPayRangeError[] {
  const errors: DriverPayRangeError[] = [];

  ranges.forEach((range, index) => {
    if (!isComplete(range)) {
      errors.push({ index, message: "Enter a start value and a rate." });
      return;
    }
    if (range.minValue < 0 || range.rateCents < 0) {
      errors.push({ index, message: "Values cannot be negative." });
      return;
    }
    if (range.maxValue !== null && range.maxValue <= range.minValue) {
      errors.push({ index, message: "End must be greater than start." });
    }
  });

  // Overlap: only worth reporting between rows that are otherwise sound, and only once
  // per pair (on the later row, which is the one the user just added).
  const sound = ranges
    .map((range, index) => ({ range, index }))
    .filter(
      ({ range, index }) =>
        isComplete(range) && !errors.some((error) => error.index === index) && range.minValue! >= 0,
    );

  for (let i = 0; i < sound.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = sound[i];
      const b = sound[j];
      const overlaps =
        a.range.minValue! < upperBound(b.range) && b.range.minValue! < upperBound(a.range);
      if (overlaps) {
        errors.push({ index: a.index, message: "This range overlaps another range." });
        break;
      }
    }
  }

  return errors.sort((a, b) => a.index - b.index);
}

/**
 * Uncovered stretches between the tiers (including below the lowest one). Not an error —
 * those values simply fall back to the flat pay rate — but worth showing.
 */
export function findDriverPayRangeGaps(ranges: DriverPayRange[]): DriverPayRangeGap[] {
  if (validateDriverPayRanges(ranges).length > 0) return [];

  const sorted = ranges.filter(isComplete).sort((a, b) => a.minValue - b.minValue);
  if (sorted.length === 0) return [];

  const gaps: DriverPayRangeGap[] = [];
  if (sorted[0].minValue > 0) {
    gaps.push({ from: 0, to: sorted[0].minValue });
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const end = sorted[i].maxValue;
    if (end === null) break; // open-ended tier swallows everything above it
    const nextStart = sorted[i + 1].minValue;
    if (end < nextStart) {
      gaps.push({ from: end, to: nextStart });
    }
  }

  return gaps;
}

/**
 * The rate that applies to `value` (distance or hours, in the driver's pay unit):
 * the matching tier, else the flat fallback rate.
 */
export function resolveDriverPayRateCents(params: {
  ranges: DriverPayRange[];
  value: number;
  fallbackRateCents: number | null;
}): number | null {
  const { ranges, value, fallbackRateCents } = params;

  const match = ranges
    .filter(isComplete)
    .find((range) => value >= range.minValue && value < upperBound(range));

  return match ? match.rateCents : fallbackRateCents;
}

/**
 * The same tiers seen the way the editor draws them: one unbroken partition of
 * `[0, ∞)`. Segments are contiguous and ordered, the first always starts at 0 and the
 * last always ends at ∞ (`to: null`), so the only thing the user can change is where the
 * cutoffs sit and what each segment pays. A driver with no tiers is a single segment
 * paying the flat rate.
 *
 * Cutoff `i` is the boundary between segment `i` and segment `i + 1`.
 */
export type DriverPaySegment = {
  id: string;
  /** Inclusive lower bound, in the driver's pay unit. Always 0 on the first segment. */
  from: number;
  /** Exclusive upper bound. null on the last segment (∞). */
  to: number | null;
  rateCents: number | null;
};

/** Stable id for the synthetic segment a driver with no tiers is drawn as. */
const BASE_SEGMENT_ID = "base";

export function toDriverPaySegments(
  payRateCents: number | null,
  ranges: DriverPayRange[],
): DriverPaySegment[] {
  if (ranges.length === 0) {
    return [{ id: BASE_SEGMENT_ID, from: 0, to: null, rateCents: payRateCents }];
  }

  return [...ranges]
    .sort((a, b) => (a.minValue ?? 0) - (b.minValue ?? 0))
    .map((range) => ({
      id: range.id,
      from: range.minValue ?? 0,
      to: range.maxValue,
      rateCents: range.rateCents,
    }));
}

/**
 * Back to what gets stored. The first segment's rate doubles as `Drivers.pay_rate_cents`,
 * so everything already reading the flat rate keeps seeing the driver's base rate, and a
 * single segment stores no DriverPayRanges rows at all.
 */
export function fromDriverPaySegments(segments: DriverPaySegment[]): {
  payRateCents: number | null;
  payRanges: DriverPayRange[];
} {
  const payRateCents = segments[0]?.rateCents ?? null;

  if (segments.length <= 1) {
    return { payRateCents, payRanges: [] };
  }

  return {
    payRateCents,
    payRanges: segments.map((segment) => ({
      id: segment.id,
      minValue: segment.from,
      maxValue: segment.to,
      rateCents: segment.rateCents,
    })),
  };
}

/**
 * Why a cutoff can't go where the user put it, or null if it can. `segmentIndex` is the
 * segment being split; when moving an existing cutoff, pass the segment on its left.
 */
export function validateDriverPayCutoff(
  segments: DriverPaySegment[],
  segmentIndex: number,
  cutoff: number | null,
): string | null {
  const segment = segments[segmentIndex];
  if (!segment) return "That range no longer exists.";
  if (cutoff === null || Number.isNaN(cutoff)) return "Enter a cutoff value.";
  if (!Number.isInteger(cutoff)) return "Use a whole number.";

  const upper = segments[segmentIndex + 1]?.to ?? segment.to;
  if (cutoff <= segment.from) return `Must be more than ${segment.from}.`;
  if (upper !== null && cutoff >= upper) return `Must be less than ${upper}.`;

  return null;
}

/** Splits a segment in two at `cutoff`. Both halves keep the rate that was there. */
export function splitDriverPaySegment(
  segments: DriverPaySegment[],
  segmentIndex: number,
  cutoff: number,
): DriverPaySegment[] {
  const segment = segments[segmentIndex];
  if (!segment) return segments;

  // Fresh ids on both halves: the left one may be the synthetic base segment, whose id is
  // not a uuid and would not survive a write.
  const left: DriverPaySegment = {
    id: crypto.randomUUID(),
    from: segment.from,
    to: cutoff,
    rateCents: segment.rateCents,
  };
  const right: DriverPaySegment = {
    id: crypto.randomUUID(),
    from: cutoff,
    to: segment.to,
    rateCents: segment.rateCents,
  };

  return segments.toSpliced(segmentIndex, 1, left, right);
}

/** Moves cutoff `cutoffIndex` (between segments `cutoffIndex` and `cutoffIndex + 1`). */
export function moveDriverPayCutoff(
  segments: DriverPaySegment[],
  cutoffIndex: number,
  cutoff: number,
): DriverPaySegment[] {
  if (!segments[cutoffIndex] || !segments[cutoffIndex + 1]) return segments;

  return segments.map((segment, index) => {
    if (index === cutoffIndex) return { ...segment, to: cutoff };
    if (index === cutoffIndex + 1) return { ...segment, from: cutoff };
    return segment;
  });
}

/** Drops a cutoff, merging the two segments it separated. The left rate survives. */
export function removeDriverPayCutoff(
  segments: DriverPaySegment[],
  cutoffIndex: number,
): DriverPaySegment[] {
  const left = segments[cutoffIndex];
  const right = segments[cutoffIndex + 1];
  if (!left || !right) return segments;

  return segments.toSpliced(cutoffIndex, 2, { ...left, to: right.to });
}

export function setDriverPaySegmentRate(
  segments: DriverPaySegment[],
  segmentIndex: number,
  rateCents: number | null,
): DriverPaySegment[] {
  return segments.map((segment, index) =>
    index === segmentIndex ? { ...segment, rateCents } : segment,
  );
}

type DriverPayRangeRow = {
  id: string;
  min_value: number;
  max_value: number | null;
  rate: number;
};

/** DB rows → form drafts, ordered the way they are displayed (lowest tier first). */
export function toDriverPayRangeDrafts(rows: DriverPayRangeRow[]): DriverPayRange[] {
  return rows
    .map((row) => ({
      id: row.id,
      minValue: row.min_value,
      maxValue: row.max_value,
      rateCents: Math.round(Number(row.rate) * 100),
    }))
    .sort((a, b) => (a.minValue ?? 0) - (b.minValue ?? 0));
}

/** Form drafts → DB rows. Incomplete rows are dropped rather than written as zeroes. */
export function toDriverPayRangeRows(
  driverUuid: string,
  ranges: DriverPayRange[],
): (DriverPayRangeRow & { driver_uuid: string })[] {
  return ranges.filter(isComplete).map((range) => ({
    id: range.id,
    driver_uuid: driverUuid,
    min_value: range.minValue,
    max_value: range.maxValue,
    rate: range.rateCents / 100,
  }));
}
