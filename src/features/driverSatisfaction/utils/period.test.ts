import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERIOD,
  describePeriod,
  filterByPeriod,
  resolvePeriod,
  type PeriodSelection,
} from "@/features/driverSatisfaction/utils/period";
import type { SatisfactionRow } from "@/features/driverSatisfaction/utils/aggregate";

// A Thursday, so the week-snapping below is visible rather than accidental.
const NOW = Date.parse("2026-08-27T15:00:00");

const period = (partial: Partial<PeriodSelection> = {}): PeriodSelection => ({
  ...DEFAULT_PERIOD,
  ...partial,
});

const row = (submittedAt: string | null, id = "r"): SatisfactionRow => ({
  responseId: id,
  driverUuid: "d1",
  driverName: "Sam Diaz",
  score: 8,
  reason: null,
  prompt: "How satisfied are you overall with the mobile app?",
  submittedAt,
  appVersion: "1.7.0",
  appPlatform: "ios",
});

describe("resolvePeriod", () => {
  /**
   * Presets snap to the start of a bucket, never to "now minus N days". An
   * unsnapped start makes the oldest column a partial week — a half-week of
   * answers plotted next to full ones reads as a dip that never happened.
   */
  it("snaps the weekly preset back to this week's Monday", () => {
    // NOW is Thursday 2026-08-27; the week it sits in opened on the 24th.
    const { start } = resolvePeriod(period({ preset: "1w" }), NOW);
    expect(start).toBe("2026-08-24");
  });

  it("snaps the monthly preset back to the first of this month", () => {
    expect(resolvePeriod(period({ preset: "1m" }), NOW).start).toBe("2026-08-01");
  });

  it("counts the current bucket as one of the N in a longer preset", () => {
    expect(resolvePeriod(period({ preset: "6m" }), NOW).start).toBe("2026-03-01");
    expect(resolvePeriod(period({ preset: "12m" }), NOW).start).toBe("2025-09-01");
  });

  it("has no bounds at all on 'all time'", () => {
    expect(resolvePeriod(period({ preset: "all" }), NOW)).toEqual({
      start: null,
      end: null,
    });
  });

  it("takes custom bounds as given", () => {
    const resolved = resolvePeriod(
      period({ preset: "custom", from: "2026-08-01", to: "2026-08-15" }),
      NOW,
    );
    expect(resolved).toEqual({ start: "2026-08-01", end: "2026-08-15" });
  });

  it("allows a custom range open at either end", () => {
    expect(resolvePeriod(period({ preset: "custom", from: "2026-08-01", to: null }), NOW)).toEqual({
      start: "2026-08-01",
      end: null,
    });
    expect(resolvePeriod(period({ preset: "custom", from: null, to: "2026-08-15" }), NOW)).toEqual({
      start: null,
      end: "2026-08-15",
    });
  });
});

describe("filterByPeriod", () => {
  const ROWS = [
    row("2026-08-27T09:00:00", "today"),
    row("2026-08-01T09:00:00", "aug1"),
    row("2026-05-04T09:00:00", "may"),
    row("2025-01-04T09:00:00", "lastYear"),
  ];

  it("keeps everything on 'all time', unreadable dates included", () => {
    const rows = [...ROWS, row(null, "undated"), row("nonsense", "broken")];
    expect(filterByPeriod(rows, period({ preset: "all" }), NOW)).toHaveLength(6);
  });

  it("keeps only what falls inside a preset", () => {
    const kept = filterByPeriod(ROWS, period({ preset: "1m" }), NOW);
    expect(kept.map((r) => r.responseId)).toEqual(["today", "aug1"]);
  });

  it("narrows to the current week on the weekly preset", () => {
    const kept = filterByPeriod(ROWS, period({ preset: "1w" }), NOW);
    expect(kept.map((r) => r.responseId)).toEqual(["today"]);
  });

  it("includes the last day of a custom range in full", () => {
    const kept = filterByPeriod(
      [row("2026-08-15T23:59:00", "lateOnLastDay")],
      period({ preset: "custom", from: "2026-08-01", to: "2026-08-15" }),
      NOW,
    );
    expect(kept).toHaveLength(1);
  });

  it("excludes the day after a custom range", () => {
    const kept = filterByPeriod(
      [row("2026-08-16T00:01:00", "nextDay")],
      period({ preset: "custom", from: "2026-08-01", to: "2026-08-15" }),
      NOW,
    );
    expect(kept).toEqual([]);
  });

  /**
   * An answer whose timestamp cannot be read belongs to no period. It survives
   * "all time" — it is still somebody's opinion — but it cannot be counted
   * inside a range without inventing a date for it.
   */
  it("drops undated answers once a range is applied", () => {
    const rows = [row(null, "undated"), row("2026-08-27T09:00:00", "today")];
    const kept = filterByPeriod(rows, period({ preset: "1m" }), NOW);
    expect(kept.map((r) => r.responseId)).toEqual(["today"]);
  });
});

describe("describePeriod", () => {
  it("names the presets", () => {
    expect(describePeriod(period({ preset: "1w" }), NOW)).toBe("Last week");
    expect(describePeriod(period({ preset: "1m" }), NOW)).toBe("Last month");
    expect(describePeriod(period({ preset: "6m" }), NOW)).toBe("Last 6 months");
    expect(describePeriod(period({ preset: "all" }), NOW)).toBe("All time");
  });

  it("spells out a custom range, open ends included", () => {
    expect(
      describePeriod(period({ preset: "custom", from: "2026-08-01", to: "2026-08-15" }), NOW),
    ).toBe("Aug 1 - Aug 15, 2026");
    expect(describePeriod(period({ preset: "custom", from: "2026-08-01", to: null }), NOW)).toBe(
      "Since Aug 1, 2026",
    );
    expect(describePeriod(period({ preset: "custom", from: null, to: "2026-08-15" }), NOW)).toBe(
      "Up to Aug 15, 2026",
    );
    expect(describePeriod(period({ preset: "custom", from: null, to: null }), NOW)).toBe(
      "All time",
    );
  });
});
