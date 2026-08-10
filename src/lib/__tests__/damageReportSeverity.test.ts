import { describe, it, expect } from "vitest";
import {
  computeDamageOverlaySeverity,
  overlaySeverityFromEffective,
} from "@/lib/damageReportSeverity";

describe("overlaySeverityFromEffective", () => {
  it("maps effective seat/haul to overlay severity", () => {
    expect(overlaySeverityFromEffective("none", "none")).toBe(null);
    expect(overlaySeverityFromEffective("minor", "none")).toBe("minor");
    expect(overlaySeverityFromEffective("major", "minor")).toBe("major");
    expect(overlaySeverityFromEffective("none", "major")).toBe("major");
  });
});

describe("damageReportSeverity lib", () => {
  it("matches dashboard squiggle rules", () => {
    expect(computeDamageOverlaySeverity("major", "none", true, true)).toBe("major");
    expect(computeDamageOverlaySeverity("minor", "none", true, true)).toBe("minor");
    expect(computeDamageOverlaySeverity("none", "none", true, true)).toBe(null);
    expect(computeDamageOverlaySeverity("none", "none", false, true)).toBe("major");
  });
});
