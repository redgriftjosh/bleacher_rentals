import { describe, it, expect } from "vitest";
import { canEditTargets } from "./canEditTargets";

describe("canEditTargets", () => {
  // --- Admin ---
  it("admin with accountManagerUuid and statType → true", () => {
    expect(canEditTargets(true, "am-uuid-1", "quotes")).toBe(true);
  });

  it("admin without accountManagerUuid → false", () => {
    expect(canEditTargets(true, null, "quotes")).toBe(false);
    expect(canEditTargets(true, undefined, "quotes")).toBe(false);
  });

  it("admin without statType → false", () => {
    expect(canEditTargets(true, "am-uuid-1", null)).toBe(false);
    expect(canEditTargets(true, "am-uuid-1", undefined)).toBe(false);
  });

  it("admin with empty string accountManagerUuid → false", () => {
    expect(canEditTargets(true, "", "quotes")).toBe(false);
  });

  it("admin with empty string statType → false", () => {
    expect(canEditTargets(true, "am-uuid-1", "")).toBe(false);
  });

  // --- Account Manager ---
  it("AM with all params → false (not admin)", () => {
    expect(canEditTargets(false, "am-uuid-1", "quotes")).toBe(false);
  });

  it("AM without accountManagerUuid → false", () => {
    expect(canEditTargets(false, null, "quotes")).toBe(false);
  });

  // --- Viewer ---
  it("viewer with all params → false (not admin)", () => {
    expect(canEditTargets(false, "am-uuid-1", "sales")).toBe(false);
  });

  // --- Edge cases ---
  it("no role, no params → false", () => {
    expect(canEditTargets(false, null, null)).toBe(false);
  });

  it("admin, no params → false", () => {
    expect(canEditTargets(true, null, null)).toBe(false);
  });
});
