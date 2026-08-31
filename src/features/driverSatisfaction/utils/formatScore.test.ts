import { describe, expect, it } from "vitest";
import { formatAverageScore, formatScore } from "@/features/driverSatisfaction/utils/formatScore";

/**
 * Every score on this page reads as a fraction of ten. On its own, "6" is
 * ambiguous — six out of what, and is more better? "6/10" answers both without
 * a legend.
 */
describe("formatScore", () => {
  it("writes a score out of ten", () => {
    expect(formatScore(9)).toBe("9/10");
    expect(formatScore(2)).toBe("2/10");
    expect(formatScore(10)).toBe("10/10");
  });

  it("shows an em dash for an answer with no score", () => {
    expect(formatScore(null)).toBe("—");
  });
});

describe("formatAverageScore", () => {
  it("keeps one decimal and the denominator", () => {
    expect(formatAverageScore(8.7)).toBe("8.7/10");
    expect(formatAverageScore(10)).toBe("10.0/10");
  });

  it("shows an em dash when there is nothing to average", () => {
    expect(formatAverageScore(null)).toBe("—");
  });
});
