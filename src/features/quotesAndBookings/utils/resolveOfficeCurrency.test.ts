import { describe, it, expect } from "vitest";
import { resolveOfficeCurrency } from "./resolveOfficeCurrency";

describe("resolveOfficeCurrency", () => {
  it("uses the QuickBooks connection currency when it is known", () => {
    expect(resolveOfficeCurrency("CAD", null)).toBe("CAD");
    expect(resolveOfficeCurrency("USD", "Ontario")).toBe("USD");
  });

  it("normalises casing and whitespace from QuickBooks", () => {
    expect(resolveOfficeCurrency(" cad ", null)).toBe("CAD");
  });

  it("ignores currencies the app does not support", () => {
    expect(resolveOfficeCurrency("EUR", "Ontario")).toBe("CAD");
    expect(resolveOfficeCurrency("EUR", "Florida")).toBe("USD");
  });

  it("falls back to the office province when QuickBooks has no currency", () => {
    expect(resolveOfficeCurrency(null, "Ontario")).toBe("CAD");
    expect(resolveOfficeCurrency(null, "ON")).toBe("CAD");
    expect(resolveOfficeCurrency(null, "Florida")).toBe("USD");
  });

  it("defaults to USD when nothing is known", () => {
    expect(resolveOfficeCurrency(null, null)).toBe("USD");
  });
});
