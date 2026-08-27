import { describe, expect, it } from "vitest";
import {
  monthlyTrend,
  summarize,
  type SatisfactionRow,
} from "@/features/driverSatisfaction/utils/aggregate";

const row = (partial: Partial<SatisfactionRow> = {}): SatisfactionRow => ({
  responseId: "r1",
  driverUuid: "d1",
  driverName: "Sam Diaz",
  score: 9,
  reason: null,
  prompt: "How satisfied are you overall with the mobile app?",
  submittedAt: "2026-08-10T12:00:00.000Z",
  appVersion: "1.7.0",
  appPlatform: "ios",
  ...partial,
});

describe("summarize", () => {
  it("reports nothing rather than zero for an empty set", () => {
    const summary = summarize([]);
    expect(summary.responseCount).toBe(0);
    expect(summary.averageScore).toBeNull();
    expect(summary.nps).toBeNull();
  });

  it("averages the scores it has", () => {
    const summary = summarize([
      row({ responseId: "a", score: 8 }),
      row({ responseId: "b", score: 6 }),
    ]);
    expect(summary.averageScore).toBe(7);
    expect(summary.responseCount).toBe(2);
  });

  /**
   * An unscored answer is a text-only question, not a zero. Counting it as one
   * would drag the average toward a number nobody gave.
   */
  it("leaves unscored answers out of the average", () => {
    const summary = summarize([
      row({ responseId: "a", score: 10 }),
      row({ responseId: "b", score: null, reason: "no opinion" }),
    ]);
    expect(summary.averageScore).toBe(10);
    expect(summary.scoredCount).toBe(1);
    expect(summary.responseCount).toBe(2);
  });

  /**
   * The detractor band is 1-6 — the same scores the app makes a driver explain.
   * A detractor here is exactly "a driver who owed us a reason", which is what
   * makes the count actionable rather than decorative.
   */
  it("splits promoters, passives and detractors on the follow-up threshold", () => {
    const summary = summarize([
      row({ responseId: "a", score: 10 }),
      row({ responseId: "b", score: 9 }),
      row({ responseId: "c", score: 8 }),
      row({ responseId: "d", score: 7 }),
      row({ responseId: "e", score: 6, reason: "too slow" }),
      row({ responseId: "f", score: 1, reason: "crashes" }),
    ]);
    expect(summary.promoters).toBe(2);
    expect(summary.passives).toBe(2);
    expect(summary.detractors).toBe(2);
    expect(summary.nps).toBe(0);
  });

  it("computes NPS as promoters minus detractors over scored answers", () => {
    const summary = summarize([
      row({ responseId: "a", score: 10 }),
      row({ responseId: "b", score: 10 }),
      row({ responseId: "c", score: 3, reason: "slow" }),
      row({ responseId: "d", score: 8 }),
    ]);
    expect(summary.nps).toBe(25);
  });

  it("counts the answers that came with something written", () => {
    const summary = summarize([
      row({ responseId: "a", score: 4, reason: "the map lags" }),
      row({ responseId: "b", score: 9, reason: null }),
      row({ responseId: "c", score: 2, reason: "   " }),
    ]);
    expect(summary.withReason).toBe(1);
  });

  it("counts each driver once even when they have answered repeatedly", () => {
    const summary = summarize([
      row({ responseId: "a", driverUuid: "d1", score: 7 }),
      row({ responseId: "b", driverUuid: "d1", score: 9 }),
      row({ responseId: "c", driverUuid: "d2", score: 5, reason: "buggy" }),
    ]);
    expect(summary.driverCount).toBe(2);
  });
});

describe("monthlyTrend", () => {
  it("groups by calendar month, oldest first", () => {
    const trend = monthlyTrend([
      row({ responseId: "a", submittedAt: "2026-07-02T09:00:00.000Z", score: 6 }),
      row({ responseId: "b", submittedAt: "2026-08-11T09:00:00.000Z", score: 8 }),
      row({ responseId: "c", submittedAt: "2026-07-28T09:00:00.000Z", score: 8 }),
    ]);
    expect(trend).toEqual([
      { month: "2026-07", average: 7, count: 2 },
      { month: "2026-08", average: 8, count: 1 },
    ]);
  });

  it("skips rows it cannot place in time rather than inventing a month", () => {
    const trend = monthlyTrend([
      row({ responseId: "a", submittedAt: null, score: 3 }),
      row({ responseId: "b", submittedAt: "nonsense", score: 4 }),
      row({ responseId: "c", submittedAt: "2026-08-11T09:00:00.000Z", score: 9 }),
    ]);
    expect(trend).toEqual([{ month: "2026-08", average: 9, count: 1 }]);
  });

  it("rounds the average to one decimal", () => {
    const trend = monthlyTrend([
      row({ responseId: "a", submittedAt: "2026-08-01T09:00:00.000Z", score: 8 }),
      row({ responseId: "b", submittedAt: "2026-08-02T09:00:00.000Z", score: 9 }),
      row({ responseId: "c", submittedAt: "2026-08-03T09:00:00.000Z", score: 9 }),
    ]);
    expect(trend[0].average).toBe(8.7);
  });

  it("has no month at all when nothing has been answered", () => {
    expect(monthlyTrend([])).toEqual([]);
  });
});
