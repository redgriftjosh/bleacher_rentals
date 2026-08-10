import { describe, it, expect } from "vitest";
import { resolveAddress } from "./resolveAddress";

type Bleacher = Parameters<typeof resolveAddress>[0];

const ev = (eventStart: string, address: string, booked = true) => ({
  booked,
  eventStart,
  address,
});
const wt = (date: string | null, dropoffAddress: string | null) => ({ date, dropoffAddress });

const bleacher = (
  bleacherEvents: Bleacher["bleacherEvents"],
  workTrackers: Bleacher["workTrackers"] = [],
): Bleacher => ({ bleacherEvents, workTrackers });

describe("resolveAddress", () => {
  describe('direction "past" (default)', () => {
    it("returns the latest event on or before the target date", () => {
      const b = bleacher([
        ev("2026-01-01T00:00:00Z", "Old Town"),
        ev("2026-03-10T00:00:00Z", "Mid Town"),
        ev("2026-09-01T00:00:00Z", "Future Town"),
      ]);
      expect(resolveAddress(b, "2026-06-15")).toBe("Mid Town");
    });

    it("includes the target date itself (<=)", () => {
      const b = bleacher([ev("2026-06-15T00:00:00Z", "Same Day")]);
      expect(resolveAddress(b, "2026-06-15")).toBe("Same Day");
    });

    it("uses a later work tracker over an earlier event", () => {
      const b = bleacher([ev("2026-06-01T00:00:00Z", "Event Addr")], [wt("2026-06-12", "WT Addr")]);
      expect(resolveAddress(b, "2026-06-15")).toBe("WT Addr");
    });

    it("ignores unbooked events", () => {
      const b = bleacher([ev("2026-06-10T00:00:00Z", "Unbooked", false)]);
      expect(resolveAddress(b, "2026-06-15")).toBeNull();
    });

    it("returns null when nothing is on or before the target", () => {
      const b = bleacher([ev("2026-09-01T00:00:00Z", "Future")]);
      expect(resolveAddress(b, "2026-06-15")).toBeNull();
    });
  });

  describe('direction "future"', () => {
    it("returns the earliest event strictly after the target date", () => {
      const b = bleacher([
        ev("2026-01-01T00:00:00Z", "Old Town"),
        ev("2026-07-01T00:00:00Z", "Next Town"),
        ev("2026-09-01T00:00:00Z", "Later Town"),
      ]);
      expect(resolveAddress(b, "2026-06-15", "future")).toBe("Next Town");
    });

    it("excludes the target date itself (strictly >)", () => {
      const b = bleacher([
        ev("2026-06-15T00:00:00Z", "Same Day"),
        ev("2026-06-20T00:00:00Z", "After"),
      ]);
      expect(resolveAddress(b, "2026-06-15", "future")).toBe("After");
    });

    it("uses an earlier work tracker over a later event", () => {
      const b = bleacher([ev("2026-08-01T00:00:00Z", "Event Addr")], [wt("2026-07-01", "WT Addr")]);
      expect(resolveAddress(b, "2026-06-15", "future")).toBe("WT Addr");
    });

    it("returns null when nothing is after the target", () => {
      const b = bleacher([ev("2026-01-01T00:00:00Z", "Past")]);
      expect(resolveAddress(b, "2026-06-15", "future")).toBeNull();
    });
  });

  describe("distance tooltip use case (past origin + future dest)", () => {
    it("resolves distinct last and next locations around a target date", () => {
      const b = bleacher([
        ev("2026-05-01T00:00:00Z", "Chicago, IL"),
        ev("2026-08-01T00:00:00Z", "Denver, CO"),
      ]);
      expect(resolveAddress(b, "2026-06-15", "past")).toBe("Chicago, IL");
      expect(resolveAddress(b, "2026-06-15", "future")).toBe("Denver, CO");
    });
  });
});
