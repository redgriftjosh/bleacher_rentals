import { describe, it, expect } from "vitest";
import {
  computeDamageOverlaySeverity,
  effectiveColumnDamage,
  overlaySeverityFromEffective,
} from "@/lib/damageReportSeverity";

describe("effectiveColumnDamage", () => {
  it("uses explicit severity when set", () => {
    expect(effectiveColumnDamage("minor", true)).toBe("minor");
    expect(effectiveColumnDamage("major", true)).toBe("major");
  });

  it("falls back to legacy is_safe when severity is none", () => {
    expect(effectiveColumnDamage("none", false)).toBe("major");
    expect(effectiveColumnDamage(null, 0)).toBe("major");
    expect(effectiveColumnDamage("none", true)).toBe("none");
  });
});

describe("computeDamageOverlaySeverity", () => {
  it("returns major when seatDamage is major", () => {
    expect(computeDamageOverlaySeverity("major", "none", true, true)).toBe("major");
  });

  it("returns major when haulDamage is major", () => {
    expect(computeDamageOverlaySeverity("none", "major", true, true)).toBe("major");
  });

  it("returns minor when seatDamage is minor", () => {
    expect(computeDamageOverlaySeverity("minor", "none", true, true)).toBe("minor");
  });

  it("returns minor when haulDamage is minor", () => {
    expect(computeDamageOverlaySeverity("none", "minor", true, true)).toBe("minor");
  });

  it("falls back to boolean: major when not safe to sit", () => {
    expect(computeDamageOverlaySeverity("none", "none", false, true)).toBe("major");
  });

  it("falls back to boolean: major when not safe to haul", () => {
    expect(computeDamageOverlaySeverity("none", "none", true, false)).toBe("major");
  });

  it("returns null when all none and all safe", () => {
    expect(computeDamageOverlaySeverity("none", "none", true, true)).toBe(null);
  });

  it("major seatDamage overrides minor haulDamage", () => {
    expect(computeDamageOverlaySeverity("major", "minor", true, true)).toBe("major");
  });
});

describe("overlaySeverityFromEffective", () => {
  it("maps effective columns to squiggle severity", () => {
    expect(overlaySeverityFromEffective("none", "none")).toBe(null);
    expect(overlaySeverityFromEffective("minor", "none")).toBe("minor");
    expect(overlaySeverityFromEffective("major", "minor")).toBe("major");
    expect(overlaySeverityFromEffective("none", "major")).toBe("major");
  });
});
