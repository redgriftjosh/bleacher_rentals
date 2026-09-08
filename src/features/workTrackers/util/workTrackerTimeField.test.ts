import { describe, expect, it } from "vitest";
import {
  isNearDstTransition,
  needsTimezoneSync,
  resolveEffectiveTimezone,
  resolveWorkTrackerTimeFieldValue,
  resyncWorkTrackerTimeFieldValue,
  workTrackerTimeFieldValueToIso,
} from "./workTrackerTimeField";

describe("resolveWorkTrackerTimeFieldValue", () => {
  it("is null when there's no timezone, regardless of value/date", () => {
    expect(resolveWorkTrackerTimeFieldValue("2026-07-15T14:00:00Z", null, "2026-07-15")).toBeNull();
    expect(resolveWorkTrackerTimeFieldValue(null, null, "2026-07-15")).toBeNull();
  });

  it("parses a stored instant into the given zone's wall-clock time", () => {
    const result = resolveWorkTrackerTimeFieldValue(
      "2026-07-15T14:00:00Z",
      "America/Toronto",
      "2026-07-15",
    );
    expect(result?.hour).toBe(10); // 14:00 UTC is 10:00 AM EDT
    expect(result?.timeZone).toBe("America/Toronto");
  });

  it("the same instant resolves to a different wall-clock time in a different zone", () => {
    const result = resolveWorkTrackerTimeFieldValue(
      "2026-07-15T14:00:00Z",
      "America/Vancouver",
      "2026-07-15",
    );
    expect(result?.hour).toBe(7); // 14:00 UTC is 7:00 AM PDT
  });

  it("defaults to 8:00 AM on the trip's own date when there's no stored value", () => {
    const result = resolveWorkTrackerTimeFieldValue(null, "America/Toronto", "2026-03-02");
    expect(result?.hour).toBe(8);
    expect(result?.minute).toBe(0);
    expect(result?.year).toBe(2026);
    expect(result?.month).toBe(3);
    expect(result?.day).toBe(2);
  });

  it("is null for a brand-new value with a timezone but no trip date yet", () => {
    expect(resolveWorkTrackerTimeFieldValue(null, "America/Toronto", null)).toBeNull();
  });

  it("round-trips through workTrackerTimeFieldValueToIso back to the original instant", () => {
    const iso = "2026-07-15T14:00:00.000Z";
    const zoned = resolveWorkTrackerTimeFieldValue(iso, "America/Toronto", "2026-07-15");
    expect(new Date(workTrackerTimeFieldValueToIso(zoned)!).toISOString()).toBe(iso);
  });
});

describe("workTrackerTimeFieldValueToIso", () => {
  it("is null for a null value", () => {
    expect(workTrackerTimeFieldValueToIso(null)).toBeNull();
  });
});

describe("resolveEffectiveTimezone", () => {
  it("prefers the stored timezone over the address's, so an existing value never silently shifts", () => {
    expect(resolveEffectiveTimezone("America/Vancouver", "America/Toronto", "UTC")).toBe(
      "America/Vancouver",
    );
  });

  it("falls back to the address's timezone when nothing is stored yet", () => {
    expect(resolveEffectiveTimezone(null, "America/Toronto", "UTC")).toBe("America/Toronto");
  });

  it("falls back to the browser's timezone as a last resort", () => {
    expect(resolveEffectiveTimezone(null, null, "America/Chicago")).toBe("America/Chicago");
  });
});

describe("needsTimezoneSync", () => {
  it("is true when a real address zone disagrees with what was saved", () => {
    expect(needsTimezoneSync("UTC", "America/Toronto")).toBe(true);
  });

  it("is false when they agree", () => {
    expect(needsTimezoneSync("America/Toronto", "America/Toronto")).toBe(false);
  });

  it("is false for a brand-new, unset time — nothing saved yet to be wrong", () => {
    expect(needsTimezoneSync(null, "America/Toronto")).toBe(false);
  });

  it("is false when the address has no coordinates yet, regardless of what's stored", () => {
    expect(needsTimezoneSync("UTC", null)).toBe(false);
  });
});

describe("resyncWorkTrackerTimeFieldValue", () => {
  it("keeps the clock reading the same and re-anchors it to the new zone", () => {
    // 8:00 AM entered while the field fell back to UTC (no address zone yet).
    const original = resolveWorkTrackerTimeFieldValue(null, "UTC", "2026-07-15");
    const iso = workTrackerTimeFieldValueToIso(original)!;

    const resynced = resyncWorkTrackerTimeFieldValue(iso, "UTC", "America/Toronto");
    const resyncedValue = resolveWorkTrackerTimeFieldValue(
      resynced,
      "America/Toronto",
      "2026-07-15",
    );

    expect(resyncedValue?.hour).toBe(8); // still reads 8:00 AM, now Eastern instead of UTC
    expect(resyncedValue?.minute).toBe(0);
    // The absolute instant moved (8:00 AM EDT ≠ 8:00 AM UTC).
    expect(resynced).not.toBe(iso);
  });

  it("is null for a null value", () => {
    expect(resyncWorkTrackerTimeFieldValue(null, "UTC", "America/Toronto")).toBeNull();
  });
});

describe("isNearDstTransition", () => {
  // America/Toronto in 2026: spring forward March 8 (EST → EDT), fall back
  // November 1 (EDT → EST).

  it("is true right on a transition date", () => {
    expect(isNearDstTransition("2026-03-08", "America/Toronto")).toBe(true);
  });

  it("is true within the window before a transition", () => {
    expect(isNearDstTransition("2026-02-28", "America/Toronto")).toBe(true); // 8 days before
  });

  it("is true within the window after a transition", () => {
    expect(isNearDstTransition("2026-03-18", "America/Toronto")).toBe(true); // 10 days after
  });

  it("is false well outside the window", () => {
    expect(isNearDstTransition("2026-07-15", "America/Toronto")).toBe(false);
  });

  it("is false just past the default 14-day window", () => {
    expect(isNearDstTransition("2026-03-25", "America/Toronto")).toBe(false); // 17 days after
  });

  it("respects a custom window size", () => {
    expect(isNearDstTransition("2026-03-25", "America/Toronto", 20)).toBe(true);
  });

  it("is false when there's no date or no timezone", () => {
    expect(isNearDstTransition(null, "America/Toronto")).toBe(false);
    expect(isNearDstTransition("2026-03-08", null)).toBe(false);
  });
});
