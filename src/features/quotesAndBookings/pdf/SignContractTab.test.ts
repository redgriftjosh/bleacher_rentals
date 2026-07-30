import { describe, it, expect } from "vitest";
import { formatSignedAt } from "./SignContractTab";

// Pin a timezone so the UTC→local conversion is deterministic regardless of the
// machine running the tests. America/New_York is EST (UTC-5) in winter and
// EDT (UTC-4) in summer, which also exercises DST handling.
const NY = "America/New_York";

describe("formatSignedAt", () => {
  it("converts a UTC instant to the given local timezone (EDT / summer)", () => {
    // 14:30 UTC on Jun 10 → 10:30 AM EDT the same day.
    const result = formatSignedAt("2026-06-10T14:30:00Z", NY);
    expect(result).toBe("Jun 10, 2026, 10:30 AM EDT");
  });

  it("rolls back to the previous day when local time is behind UTC (EST / winter)", () => {
    // Midnight UTC Jan 1 → 7:00 PM EST on Dec 31 of the prior year.
    const result = formatSignedAt("2026-01-01T00:00:00Z", NY);
    expect(result).toBe("Dec 31, 2025, 7:00 PM EST");
  });

  it("includes a timezone abbreviation", () => {
    expect(formatSignedAt("2026-06-10T14:30:00Z", NY)).toContain("EDT");
  });
});
