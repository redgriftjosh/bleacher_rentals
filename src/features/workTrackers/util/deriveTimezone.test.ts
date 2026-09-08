import { describe, expect, it } from "vitest";
import { deriveTimezone, getBrowserTimezone } from "./deriveTimezone";

describe("deriveTimezone", () => {
  it("resolves a known Ontario coordinate to America/Toronto", () => {
    // Simcoe, ON — the address from the AddressAutoComplete bug report.
    expect(deriveTimezone(42.8339, -80.3037)).toBe("America/Toronto");
  });

  it("resolves a Pacific coordinate to America/Vancouver", () => {
    expect(deriveTimezone(49.2827, -123.1207)).toBe("America/Vancouver");
  });

  it("is null when lat or lng is missing", () => {
    expect(deriveTimezone(null, -80.3037)).toBeNull();
    expect(deriveTimezone(42.8339, null)).toBeNull();
    expect(deriveTimezone(undefined, undefined)).toBeNull();
  });

  it("is null rather than throwing on an out-of-range coordinate", () => {
    expect(deriveTimezone(999, 999)).toBeNull();
  });
});

describe("getBrowserTimezone", () => {
  it("resolves a real, non-empty IANA zone", () => {
    const tz = getBrowserTimezone();
    expect(typeof tz).toBe("string");
    expect(tz.length).toBeGreaterThan(0);
  });
});
