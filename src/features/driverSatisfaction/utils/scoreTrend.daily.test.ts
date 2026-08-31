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
 * The finest zoom level: one point per calendar day, in the viewer's own
 * timezone. Useful the day after a release, when the question is whether
 * something changed *today*, and the weekly line has not moved yet.
 */
describe("scoreTrend, daily", () => {
  it("buckets by calendar day", () => {
    const trend = scoreTrend(
      [
        row("2026-08-12T08:00:00", 6, "morning"),
        row("2026-08-12T21:30:00", 8, "evening"),
        row("2026-08-13T10:00:00", 10, "nextDay"),
      ],
      "day",
    );
    expect(trend).toEqual([
      {
        bucketStart: "2026-08-12",
        label: "Wed, Aug 12",
        axisLabel: "Aug 12",
        average: 7,
        count: 2,
      },
      {
        bucketStart: "2026-08-13",
        label: "Thu, Aug 13",
        axisLabel: "Aug 13",
        average: 10,
        count: 1,
      },
    ]);
  });

  it("splits at midnight, not at any other hour", () => {
    const trend = scoreTrend(
      [row("2026-08-12T23:59:00", 2, "late"), row("2026-08-13T00:01:00", 10, "early")],
      "day",
    );
    expect(trend.map((point) => point.bucketStart)).toEqual(["2026-08-12", "2026-08-13"]);
  });

  it("collapses to fewer points at coarser granularities", () => {
    const rows = [row("2026-08-12T09:00:00", 4, "a"), row("2026-08-13T09:00:00", 10, "b")];
    expect(scoreTrend(rows, "day")).toHaveLength(2);
    expect(scoreTrend(rows, "week")).toHaveLength(1);
    expect(scoreTrend(rows, "month")).toHaveLength(1);
  });

  it("skips undated and unscored answers like every other granularity", () => {
    const rows: SatisfactionRow[] = [
      row("2026-08-12T09:00:00", 9, "ok"),
      row("nonsense", 4, "broken"),
      { ...row("2026-08-12T09:00:00", 9, "unscored"), score: null },
    ];
    const trend = scoreTrend(rows, "day");
    expect(trend).toHaveLength(1);
    expect(trend[0].count).toBe(1);
  });

  it("has nothing to show for no answers", () => {
    expect(scoreTrend([], "day")).toEqual([]);
  });
});
