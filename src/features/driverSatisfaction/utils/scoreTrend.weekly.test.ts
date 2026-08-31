import { describe, expect, it } from "vitest";
import { scoreTrend } from "@/features/driverSatisfaction/utils/aggregate";
import type { SatisfactionRow } from "@/features/driverSatisfaction/utils/aggregate";

const row = (partial: Partial<SatisfactionRow> = {}): SatisfactionRow => ({
  responseId: "r1",
  driverUuid: "d1",
  driverName: "Sam Diaz",
  score: 9,
  reason: null,
  prompt: "How satisfied are you overall with the mobile app?",
  submittedAt: "2026-08-12T12:00:00.000Z",
  appVersion: "1.7.0",
  appPlatform: "ios",
  ...partial,
});

/**
 * The week is the sales scorecard's week: Monday to Sunday, the same boundary
 * `getPeriodBounds` snaps to (Luxon `startOf("week")`). Two pages that both say
 * "this week" and mean different days is the kind of mismatch nobody notices
 * until two numbers are compared in a meeting.
 */
describe("scoreTrend, weekly", () => {
  it("buckets a week Monday through Sunday", () => {
    // 2026-08-10 is a Monday; 2026-08-16 the Sunday that closes that week.
    const trend = scoreTrend(
      [
        row({ responseId: "a", submittedAt: "2026-08-10T08:00:00", score: 6 }),
        row({ responseId: "b", submittedAt: "2026-08-16T23:00:00", score: 8 }),
      ],
      "week",
    );
    expect(trend).toHaveLength(1);
    expect(trend[0].bucketStart).toBe("2026-08-10");
    expect(trend[0].average).toBe(7);
    expect(trend[0].count).toBe(2);
  });

  it("starts a new bucket on Monday, not Sunday", () => {
    const trend = scoreTrend(
      [
        row({ responseId: "a", submittedAt: "2026-08-16T23:00:00", score: 4 }),
        row({ responseId: "b", submittedAt: "2026-08-17T01:00:00", score: 10 }),
      ],
      "week",
    );
    expect(trend.map((point) => point.bucketStart)).toEqual(["2026-08-10", "2026-08-17"]);
  });

  it("returns weeks oldest first", () => {
    const trend = scoreTrend(
      [
        row({ responseId: "a", submittedAt: "2026-08-25T09:00:00", score: 7 }),
        row({ responseId: "b", submittedAt: "2026-08-11T09:00:00", score: 9 }),
      ],
      "week",
    );
    expect(trend.map((point) => point.bucketStart)).toEqual(["2026-08-10", "2026-08-24"]);
  });

  it("labels the week as its Monday-to-Sunday span", () => {
    const trend = scoreTrend([row({ submittedAt: "2026-08-12T09:00:00", score: 9 })], "week");
    expect(trend[0].label).toBe("Aug 10 - Aug 16");
  });

  it("skips rows it cannot place in time rather than inventing a week", () => {
    const trend = scoreTrend(
      [
        row({ responseId: "a", submittedAt: null, score: 3 }),
        row({ responseId: "b", submittedAt: "nonsense", score: 4 }),
        row({ responseId: "c", submittedAt: "2026-08-12T09:00:00", score: 9 }),
      ],
      "week",
    );
    expect(trend).toEqual([
      {
        bucketStart: "2026-08-10",
        label: "Aug 10 - Aug 16",
        axisLabel: "Aug 10",
        average: 9,
        count: 1,
      },
    ]);
  });

  it("ignores unscored answers", () => {
    const trend = scoreTrend(
      [
        row({ responseId: "a", submittedAt: "2026-08-12T09:00:00", score: null }),
        row({ responseId: "b", submittedAt: "2026-08-12T09:00:00", score: 8 }),
      ],
      "week",
    );
    expect(trend[0].count).toBe(1);
    expect(trend[0].average).toBe(8);
  });

  it("rounds the average to one decimal", () => {
    const trend = scoreTrend(
      [
        row({ responseId: "a", submittedAt: "2026-08-10T09:00:00", score: 8 }),
        row({ responseId: "b", submittedAt: "2026-08-11T09:00:00", score: 9 }),
        row({ responseId: "c", submittedAt: "2026-08-12T09:00:00", score: 9 }),
      ],
      "week",
    );
    expect(trend[0].average).toBe(8.7);
  });

  it("has no week at all when nothing has been answered", () => {
    expect(scoreTrend([], "week")).toEqual([]);
  });
});
