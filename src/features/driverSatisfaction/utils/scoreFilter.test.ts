import { describe, expect, it } from "vitest";
import {
  applyScoreFilter,
  describeScoreFilter,
  type ScoreFilter,
} from "@/features/driverSatisfaction/utils/scoreFilter";
import type { SatisfactionRow } from "@/features/driverSatisfaction/utils/aggregate";

const row = (score: number | null, id = "r"): SatisfactionRow => ({
  responseId: id,
  driverUuid: "d1",
  driverName: "Sam Diaz",
  score,
  reason: score !== null && score <= 6 ? "too slow" : null,
  prompt: "How satisfied are you overall with the mobile app?",
  submittedAt: "2026-08-12T12:00:00.000Z",
  appVersion: "1.7.0",
  appPlatform: "ios",
});

const ROWS = [row(10, "a"), row(7, "b"), row(6, "c"), row(2, "d"), row(null, "e")];

const filter = (mode: ScoreFilter["mode"], score = 6): ScoreFilter => ({
  mode,
  score,
});

describe("applyScoreFilter", () => {
  it("keeps everything, unscored included, on 'all'", () => {
    expect(applyScoreFilter(ROWS, filter("all"))).toHaveLength(5);
  });

  it("keeps the threshold itself on 'at or below'", () => {
    const kept = applyScoreFilter(ROWS, filter("at_or_below", 6));
    expect(kept.map((r) => r.score)).toEqual([6, 2]);
  });

  it("keeps the threshold itself on 'at or above'", () => {
    const kept = applyScoreFilter(ROWS, filter("at_or_above", 7));
    expect(kept.map((r) => r.score)).toEqual([10, 7]);
  });

  /**
   * An answer with no score cannot satisfy a threshold in either direction —
   * a text-only answer is not "0 and below". It appears only under "All".
   */
  it("drops unscored answers from either threshold", () => {
    expect(applyScoreFilter(ROWS, filter("at_or_below", 10))).toHaveLength(4);
    expect(applyScoreFilter(ROWS, filter("at_or_above", 1))).toHaveLength(4);
  });

  it("can select a single score from both ends", () => {
    const below = applyScoreFilter(ROWS, filter("at_or_below", 2));
    const above = applyScoreFilter(ROWS, filter("at_or_above", 10));
    expect(below.map((r) => r.score)).toEqual([2]);
    expect(above.map((r) => r.score)).toEqual([10]);
  });

  it("returns nothing when no answer clears the threshold", () => {
    expect(applyScoreFilter(ROWS, filter("at_or_below", 1))).toEqual([]);
  });
});

describe("describeScoreFilter", () => {
  it("names each mode the way the dropdown reads", () => {
    expect(describeScoreFilter(filter("all"))).toBe("All scores");
    expect(describeScoreFilter(filter("at_or_below", 6))).toBe("6/10 and below");
    expect(describeScoreFilter(filter("at_or_above", 8))).toBe("8/10 and above");
  });
});
