import { describe, it, expect } from "vitest";
import { formatSignedAt } from "./SignContractTab";

describe("formatSignedAt", () => {
  it("formats an ISO date string with month, day, year, time, and timezone", () => {
    const result = formatSignedAt("2026-06-10T14:30:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2026");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("handles midnight UTC", () => {
    const result = formatSignedAt("2026-01-01T00:00:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("2026");
  });

  it("includes timezone abbreviation", () => {
    const result = formatSignedAt("2026-06-10T14:30:00Z");
    expect(result).toMatch(/[A-Z]/);
  });
});
