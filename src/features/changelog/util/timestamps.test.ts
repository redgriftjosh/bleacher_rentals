import { describe, it, expect } from "vitest";
import { toEpochMs } from "./timestamps";

describe("toEpochMs", () => {
  it("parses a client-written ISO string", () => {
    expect(toEpochMs("2026-08-10T12:00:00.000Z")).toBe(Date.UTC(2026, 7, 10, 12));
  });

  it("parses a Postgres timestamptz synced through PowerSync", () => {
    expect(toEpochMs("2026-08-10 12:00:00+00")).toBe(Date.UTC(2026, 7, 10, 12));
  });

  it("treats both shapes of the same instant as equal", () => {
    expect(toEpochMs("2026-08-10 12:00:00+00")).toBe(toEpochMs("2026-08-10T12:00:00.000Z"));
  });

  it("compares correctly across the two shapes", () => {
    // Lexicographically "2026-08-10 ..." sorts BELOW "2026-08-10T..." because
    // " " < "T", which would make the newer Postgres value look older.
    const pgNewer = toEpochMs("2026-08-11 00:00:00+00")!;
    const isoOlder = toEpochMs("2026-08-10T00:00:00.000Z")!;
    expect(pgNewer).toBeGreaterThan(isoOlder);
  });

  it.each([null, undefined, "", "not a date"])("returns null for %s", (v) => {
    expect(toEpochMs(v as string | null | undefined)).toBeNull();
  });
});
