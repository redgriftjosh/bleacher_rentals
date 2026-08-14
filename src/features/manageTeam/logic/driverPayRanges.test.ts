import { describe, it, expect } from "vitest";
import {
  findDriverPayRangeGaps,
  fromDriverPaySegments,
  moveDriverPayCutoff,
  removeDriverPayCutoff,
  resolveDriverPayRateCents,
  setDriverPaySegmentRate,
  splitDriverPaySegment,
  toDriverPayRangeDrafts,
  toDriverPayRangeRows,
  toDriverPaySegments,
  validateDriverPayCutoff,
  validateDriverPayRanges,
  type DriverPayRange,
  type DriverPaySegment,
} from "./driverPayRanges";

function range(
  id: string,
  minValue: number | null,
  maxValue: number | null,
  rateCents: number | null,
): DriverPayRange {
  return { id, minValue, maxValue, rateCents };
}

describe("validateDriverPayRanges", () => {
  it("accepts contiguous tiers with an open-ended top", () => {
    expect(
      validateDriverPayRanges([
        range("a", 0, 100, 150),
        range("b", 100, 300, 125),
        range("c", 300, null, 100),
      ]),
    ).toEqual([]);
  });

  it("flags a row missing a start value or a rate", () => {
    const errors = validateDriverPayRanges([
      range("a", null, 100, 150),
      range("b", 100, 300, null),
    ]);
    expect(errors.map((e) => e.index)).toEqual([0, 1]);
    expect(errors[0].message).toMatch(/start value and a rate/);
  });

  it("flags an end that is not past the start", () => {
    const errors = validateDriverPayRanges([range("a", 100, 100, 150)]);
    expect(errors).toEqual([{ index: 0, message: "End must be greater than start." }]);
  });

  it("flags negative values", () => {
    expect(validateDriverPayRanges([range("a", -1, 100, 150)])[0].message).toMatch(/negative/);
    expect(validateDriverPayRanges([range("a", 0, 100, -5)])[0].message).toMatch(/negative/);
  });

  it("flags overlapping tiers once, on the later row", () => {
    const errors = validateDriverPayRanges([range("a", 0, 200, 150), range("b", 100, 300, 125)]);
    expect(errors).toEqual([{ index: 1, message: "This range overlaps another range." }]);
  });

  it("treats touching bounds as contiguous, not overlapping", () => {
    expect(validateDriverPayRanges([range("a", 0, 100, 150), range("b", 100, 200, 125)])).toEqual(
      [],
    );
  });

  it("flags a second open-ended tier as an overlap", () => {
    const errors = validateDriverPayRanges([
      range("a", 100, null, 150),
      range("b", 500, null, 125),
    ]);
    expect(errors).toEqual([{ index: 1, message: "This range overlaps another range." }]);
  });

  it("does not report overlaps against rows that are already invalid", () => {
    const errors = validateDriverPayRanges([range("a", null, null, null), range("b", 0, 100, 150)]);
    expect(errors).toEqual([{ index: 0, message: "Enter a start value and a rate." }]);
  });
});

describe("findDriverPayRangeGaps", () => {
  it("finds nothing when the tiers are contiguous from zero", () => {
    expect(findDriverPayRangeGaps([range("a", 0, 100, 150), range("b", 100, null, 125)])).toEqual(
      [],
    );
  });

  it("reports the stretch below the lowest tier", () => {
    expect(findDriverPayRangeGaps([range("a", 50, 100, 150)])).toEqual([{ from: 0, to: 50 }]);
  });

  it("reports a hole between two tiers", () => {
    expect(findDriverPayRangeGaps([range("a", 0, 100, 150), range("b", 200, 300, 125)])).toEqual([
      { from: 100, to: 200 },
    ]);
  });

  it("ignores order the rows happen to be in", () => {
    expect(findDriverPayRangeGaps([range("a", 200, 300, 125), range("b", 0, 100, 150)])).toEqual([
      { from: 100, to: 200 },
    ]);
  });

  it("stays quiet while the ranges are invalid", () => {
    expect(findDriverPayRangeGaps([range("a", 0, null, null)])).toEqual([]);
  });
});

describe("resolveDriverPayRateCents", () => {
  const ranges = [range("a", 0, 100, 150), range("b", 100, 300, 125), range("c", 300, null, 100)];

  it("picks the tier containing the value", () => {
    expect(resolveDriverPayRateCents({ ranges, value: 50, fallbackRateCents: 999 })).toBe(150);
    expect(resolveDriverPayRateCents({ ranges, value: 250, fallbackRateCents: 999 })).toBe(125);
    expect(resolveDriverPayRateCents({ ranges, value: 5000, fallbackRateCents: 999 })).toBe(100);
  });

  it("treats the start as inclusive and the end as exclusive", () => {
    expect(resolveDriverPayRateCents({ ranges, value: 100, fallbackRateCents: 999 })).toBe(125);
  });

  it("falls back to the flat rate with no ranges", () => {
    expect(resolveDriverPayRateCents({ ranges: [], value: 50, fallbackRateCents: 999 })).toBe(999);
  });

  it("falls back to the flat rate for a value in a gap", () => {
    expect(
      resolveDriverPayRateCents({
        ranges: [range("a", 100, 200, 150)],
        value: 50,
        fallbackRateCents: 999,
      }),
    ).toBe(999);
  });

  it("ignores incomplete rows", () => {
    expect(
      resolveDriverPayRateCents({
        ranges: [range("a", 0, 100, null)],
        value: 50,
        fallbackRateCents: 999,
      }),
    ).toBe(999);
  });
});

describe("db mapping", () => {
  it("converts rows to drafts, cents-ward and sorted by start value", () => {
    expect(
      toDriverPayRangeDrafts([
        { id: "b", min_value: 100, max_value: null, rate: 1.25 },
        { id: "a", min_value: 0, max_value: 100, rate: 1.5 },
      ]),
    ).toEqual([
      { id: "a", minValue: 0, maxValue: 100, rateCents: 150 },
      { id: "b", minValue: 100, maxValue: null, rateCents: 125 },
    ]);
  });

  it("converts drafts to rows, dollars-ward, dropping incomplete rows", () => {
    expect(
      toDriverPayRangeRows("driver-1", [
        range("a", 0, 100, 150),
        range("b", null, 300, 125),
        range("c", 300, null, null),
      ]),
    ).toEqual([{ id: "a", driver_uuid: "driver-1", min_value: 0, max_value: 100, rate: 1.5 }]);
  });

  it("round-trips a rate through cents without drifting", () => {
    const drafts = toDriverPayRangeDrafts([{ id: "a", min_value: 0, max_value: 10, rate: 0.07 }]);
    expect(drafts[0].rateCents).toBe(7);
    expect(toDriverPayRangeRows("d", drafts)[0].rate).toBe(0.07);
  });
});

function segment(id: string, from: number, to: number | null, rateCents: number): DriverPaySegment {
  return { id, from, to, rateCents };
}

describe("segment view", () => {
  it("draws a driver with no tiers as one segment at the flat rate", () => {
    expect(toDriverPaySegments(300, [])).toEqual([
      { id: "base", from: 0, to: null, rateCents: 300 },
    ]);
  });

  it("draws the tiers in order, lowest first", () => {
    expect(toDriverPaySegments(300, [range("b", 100, null, 250), range("a", 0, 100, 300)])).toEqual(
      [
        { id: "a", from: 0, to: 100, rateCents: 300 },
        { id: "b", from: 100, to: null, rateCents: 250 },
      ],
    );
  });

  it("stores a single segment as the flat rate and no tiers", () => {
    expect(fromDriverPaySegments([segment("base", 0, null, 300)])).toEqual({
      payRateCents: 300,
      payRanges: [],
    });
  });

  it("stores several segments as tiers, with the first rate as the flat rate", () => {
    expect(
      fromDriverPaySegments([segment("a", 0, 100, 300), segment("b", 100, null, 250)]),
    ).toEqual({
      payRateCents: 300,
      payRanges: [
        { id: "a", minValue: 0, maxValue: 100, rateCents: 300 },
        { id: "b", minValue: 100, maxValue: null, rateCents: 250 },
      ],
    });
  });

  it("round-trips through the stored shape", () => {
    const segments = [segment("a", 0, 100, 300), segment("b", 100, null, 250)];
    const stored = fromDriverPaySegments(segments);
    expect(toDriverPaySegments(stored.payRateCents, stored.payRanges)).toEqual(segments);
  });

  it("produces tiers that pass validation and cover everything", () => {
    const { payRanges } = fromDriverPaySegments([
      segment("a", 0, 100, 300),
      segment("b", 100, 200, 250),
      segment("c", 200, null, 225),
    ]);
    expect(validateDriverPayRanges(payRanges)).toEqual([]);
    expect(findDriverPayRangeGaps(payRanges)).toEqual([]);
  });
});

describe("validateDriverPayCutoff", () => {
  const segments = [segment("a", 0, 100, 300), segment("b", 100, null, 250)];

  it("accepts a value inside the segment", () => {
    expect(validateDriverPayCutoff(segments, 0, 50)).toBeNull();
    expect(validateDriverPayCutoff(segments, 1, 500)).toBeNull();
  });

  it("rejects a missing or fractional value", () => {
    expect(validateDriverPayCutoff(segments, 0, null)).toMatch(/Enter a cutoff/);
    expect(validateDriverPayCutoff(segments, 0, 12.5)).toMatch(/whole number/);
  });

  it("rejects a value at or below where the segment starts", () => {
    expect(validateDriverPayCutoff(segments, 0, 0)).toMatch(/more than 0/);
    expect(validateDriverPayCutoff(segments, 1, 100)).toMatch(/more than 100/);
  });

  it("rejects a value at or past where the segment ends", () => {
    expect(validateDriverPayCutoff(segments, 0, 100)).toMatch(/less than 100/);
    expect(validateDriverPayCutoff(segments, 0, 150)).toMatch(/less than 100/);
  });

  it("lets a moved cutoff run up to the following segment's end", () => {
    const three = [
      segment("a", 0, 100, 300),
      segment("b", 100, 200, 250),
      segment("c", 200, null, 225),
    ];
    expect(validateDriverPayCutoff(three, 0, 150)).toBeNull();
    expect(validateDriverPayCutoff(three, 0, 200)).toMatch(/less than 200/);
  });
});

describe("segment editing", () => {
  it("splits a segment in two, both halves keeping the rate", () => {
    const result = splitDriverPaySegment([segment("base", 0, null, 300)], 0, 100);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ from: 0, to: 100, rateCents: 300 });
    expect(result[1]).toMatchObject({ from: 100, to: null, rateCents: 300 });
  });

  it("gives both halves fresh ids, so the synthetic base id is never stored", () => {
    const result = splitDriverPaySegment([segment("base", 0, null, 300)], 0, 100);

    expect(result[0].id).not.toBe("base");
    expect(result[1].id).not.toBe("base");
    expect(result[0].id).not.toBe(result[1].id);
  });

  it("splits a middle segment without disturbing its neighbours", () => {
    const segments = [segment("a", 0, 100, 300), segment("b", 100, null, 250)];
    const result = splitDriverPaySegment(segments, 1, 200);

    expect(result.map((s) => [s.from, s.to])).toEqual([
      [0, 100],
      [100, 200],
      [200, null],
    ]);
    expect(result[0].id).toBe("a");
  });

  it("moves a cutoff on both sides of it at once", () => {
    const segments = [segment("a", 0, 100, 300), segment("b", 100, null, 250)];
    expect(moveDriverPayCutoff(segments, 0, 150).map((s) => [s.from, s.to])).toEqual([
      [0, 150],
      [150, null],
    ]);
  });

  it("merges two segments when a cutoff is removed, keeping the left rate", () => {
    const segments = [segment("a", 0, 100, 300), segment("b", 100, null, 250)];
    expect(removeDriverPayCutoff(segments, 0)).toEqual([
      { id: "a", from: 0, to: null, rateCents: 300 },
    ]);
  });

  it("leaves the partition unbroken after a removal in the middle", () => {
    const segments = [
      segment("a", 0, 100, 300),
      segment("b", 100, 200, 250),
      segment("c", 200, null, 225),
    ];
    expect(removeDriverPayCutoff(segments, 1).map((s) => [s.from, s.to])).toEqual([
      [0, 100],
      [100, null],
    ]);
  });

  it("changes one segment's rate and nothing else", () => {
    const segments = [segment("a", 0, 100, 300), segment("b", 100, null, 250)];
    expect(setDriverPaySegmentRate(segments, 1, 275)).toEqual([
      segment("a", 0, 100, 300),
      segment("b", 100, null, 275),
    ]);
  });
});
