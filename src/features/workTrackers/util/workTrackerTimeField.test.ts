import { describe, expect, it } from "vitest";
import {
  normalizeWorkTrackerTime,
  switchWorkTrackerTimeMode,
  toInputTimeValue,
} from "./workTrackerTimeField";

describe("normalizeWorkTrackerTime", () => {
  it("pads an input-style HH:MM value with seconds", () => {
    expect(normalizeWorkTrackerTime("9:00")).toBe("09:00:00");
    expect(normalizeWorkTrackerTime("09:00")).toBe("09:00:00");
  });

  it("passes an already-HH:MM:SS value through unchanged (shape-wise)", () => {
    expect(normalizeWorkTrackerTime("09:00:00")).toBe("09:00:00");
  });

  it("is null for empty/invalid input", () => {
    expect(normalizeWorkTrackerTime(null)).toBeNull();
    expect(normalizeWorkTrackerTime("")).toBeNull();
    expect(normalizeWorkTrackerTime("not a time")).toBeNull();
    expect(normalizeWorkTrackerTime("25:00")).toBeNull();
  });
});

describe("toInputTimeValue", () => {
  it('strips seconds for the <input type="time"> value', () => {
    expect(toInputTimeValue("09:00:00")).toBe("09:00");
  });

  it("is empty for null/empty", () => {
    expect(toInputTimeValue(null)).toBe("");
    expect(toInputTimeValue("")).toBe("");
  });
});

describe("switchWorkTrackerTimeMode", () => {
  it("any_time clears both values regardless of the current mode", () => {
    expect(
      switchWorkTrackerTimeMode({ mode: "exact", start: "09:00:00", end: "09:00:00" }, "any_time"),
    ).toEqual({ mode: "any_time", start: null, end: null });
  });

  it("exact from any_time seeds the 8:00 AM default", () => {
    expect(
      switchWorkTrackerTimeMode({ mode: "any_time", start: null, end: null }, "exact"),
    ).toEqual({ mode: "exact", start: "08:00:00", end: "08:00:00" });
  });

  it("exact from flexible keeps the flexible start, drops the end", () => {
    expect(
      switchWorkTrackerTimeMode({ mode: "flexible", start: "09:00:00", end: "11:00:00" }, "exact"),
    ).toEqual({ mode: "exact", start: "09:00:00", end: "09:00:00" });
  });

  it("flexible from any_time seeds an 8:00-9:00 default window", () => {
    expect(
      switchWorkTrackerTimeMode({ mode: "any_time", start: null, end: null }, "flexible"),
    ).toEqual({ mode: "flexible", start: "08:00:00", end: "09:00:00" });
  });

  it("flexible from exact keeps the time as the start, adds a 1hr end", () => {
    expect(
      switchWorkTrackerTimeMode({ mode: "exact", start: "22:30:00", end: "22:30:00" }, "flexible"),
    ).toEqual({ mode: "flexible", start: "22:30:00", end: "23:30:00" });
  });

  it("flexible's default window clamps at end of day instead of wrapping past midnight", () => {
    expect(
      switchWorkTrackerTimeMode({ mode: "exact", start: "23:30:00", end: "23:30:00" }, "flexible"),
    ).toEqual({ mode: "flexible", start: "23:30:00", end: "23:59:00" });
  });

  it("re-selecting the already-active flexible mode is a no-op", () => {
    const current = { mode: "flexible" as const, start: "09:00:00", end: "12:00:00" };
    expect(switchWorkTrackerTimeMode(current, "flexible")).toEqual(current);
  });
});
