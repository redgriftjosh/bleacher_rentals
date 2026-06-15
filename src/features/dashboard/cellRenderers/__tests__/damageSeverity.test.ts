import { describe, it, expect } from "vitest";
import type { BleacherDamageReport, DamageSeverity } from "../../types";

function computeSeverity(dr: Pick<BleacherDamageReport, "seatDamage" | "haulDamage" | "isSafeToSit" | "isSafeToHaul">): DamageSeverity {
  if (dr.seatDamage === "major" || dr.haulDamage === "major") return "major";
  if (dr.seatDamage === "minor" || dr.haulDamage === "minor") return "minor";
  if (!dr.isSafeToSit || !dr.isSafeToHaul) return "major";
  return "minor";
}

describe("computeSeverity for damage overlay", () => {
  it("returns major when seatDamage is major", () => {
    expect(
      computeSeverity({ seatDamage: "major", haulDamage: "none", isSafeToSit: true, isSafeToHaul: true }),
    ).toBe("major");
  });

  it("returns major when haulDamage is major", () => {
    expect(
      computeSeverity({ seatDamage: "none", haulDamage: "major", isSafeToSit: true, isSafeToHaul: true }),
    ).toBe("major");
  });

  it("returns minor when seatDamage is minor", () => {
    expect(
      computeSeverity({ seatDamage: "minor", haulDamage: "none", isSafeToSit: true, isSafeToHaul: true }),
    ).toBe("minor");
  });

  it("returns minor when haulDamage is minor", () => {
    expect(
      computeSeverity({ seatDamage: "none", haulDamage: "minor", isSafeToSit: true, isSafeToHaul: true }),
    ).toBe("minor");
  });

  it("falls back to boolean: major when not safe to sit", () => {
    expect(
      computeSeverity({ seatDamage: "none", haulDamage: "none", isSafeToSit: false, isSafeToHaul: true }),
    ).toBe("major");
  });

  it("falls back to boolean: major when not safe to haul", () => {
    expect(
      computeSeverity({ seatDamage: "none", haulDamage: "none", isSafeToSit: true, isSafeToHaul: false }),
    ).toBe("major");
  });

  it("returns minor when all none and all safe (backward compat baseline)", () => {
    expect(
      computeSeverity({ seatDamage: "none", haulDamage: "none", isSafeToSit: true, isSafeToHaul: true }),
    ).toBe("minor");
  });

  it("major seatDamage overrides minor haulDamage", () => {
    expect(
      computeSeverity({ seatDamage: "major", haulDamage: "minor", isSafeToSit: true, isSafeToHaul: true }),
    ).toBe("major");
  });
});
