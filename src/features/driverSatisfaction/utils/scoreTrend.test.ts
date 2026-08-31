import { describe, expect, it } from "vitest";
import { scoreTrend } from "@/features/driverSatisfaction/utils/aggregate";
import type { SatisfactionRow } from "@/features/driverSatisfaction/utils/aggregate";

const row = (submittedAt: string, score: number, id = "r"): SatisfactionRow => ({
  responseId: id,
  driverUuid: "d1",
  driverName: "Sam Diaz",
  score,
  reason: null,
  prompt: "How satisfied are you overall with the mobile app?",
  submittedAt,
  appVersion: "1.7.0",
  appPlatform: "ios",
});

/**
 * The same aggregation at two zoom levels. Weekly is the sales scorecard's week
 * (Monday-Sunday); monthly is the calendar month. Which one the page shows is
 * the reader's choice: a weekly line answers "did last week's release hurt",
 * a monthly one answers "are we drifting".
 */
describe("scoreTrend", () => {
  it("buckets by calendar month when asked for months", () => {
    const trend = scoreTrend(
      [
        row("2026-07-02T09:00:00", 6, "a"),
        row("2026-07-28T09:00:00", 8, "b"),
        row("2026-08-11T09:00:00", 8, "c"),
      ],
      "month",
    );
    expect(trend).toEqual([
      { bucketStart: "2026-07-01", label: "Jul 2026", axisLabel: "Jul", average: 7, count: 2 },
      { bucketStart: "2026-08-01", label: "Aug 2026", axisLabel: "Aug", average: 8, count: 1 },
    ]);
  });

  it("splits the same answers differently at each granularity", () => {
    const rows = [row("2026-08-03T09:00:00", 4, "a"), row("2026-08-25T09:00:00", 10, "b")];
    expect(scoreTrend(rows, "week")).toHaveLength(2);
    expect(scoreTrend(rows, "month")).toHaveLength(1);
    expect(scoreTrend(rows, "month")[0].average).toBe(7);
  });

  it("keeps the Monday boundary on weeks", () => {
    const trend = scoreTrend(
      [row("2026-08-16T23:00:00", 4, "sun"), row("2026-08-17T01:00:00", 10, "mon")],
      "week",
    );
    expect(trend.map((point) => point.bucketStart)).toEqual(["2026-08-10", "2026-08-17"]);
    expect(trend[0].label).toBe("Aug 10 - Aug 16");
  });

  it("skips rows it cannot place in time at either granularity", () => {
    const rows: SatisfactionRow[] = [
      { ...row("2026-08-12T09:00:00", 9, "ok") },
      { ...row("nonsense", 4, "broken") },
      { ...row("2026-08-12T09:00:00", 9, "unscored"), score: null },
    ];
    expect(scoreTrend(rows, "week")[0].count).toBe(1);
    expect(scoreTrend(rows, "month")[0].count).toBe(1);
  });

  it("has nothing to show for no answers", () => {
    expect(scoreTrend([], "week")).toEqual([]);
    expect(scoreTrend([], "month")).toEqual([]);
  });
});
