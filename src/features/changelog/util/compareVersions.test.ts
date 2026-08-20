import { describe, it, expect } from "vitest";
import { compareVersions, isValidVersion } from "./compareVersions";

describe("compareVersions", () => {
  it("orders by major", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
  });

  it("orders by minor", () => {
    expect(compareVersions("1.2.0", "1.1.9")).toBeGreaterThan(0);
  });

  it("orders by patch", () => {
    expect(compareVersions("1.0.0", "1.0.1")).toBeLessThan(0);
  });

  it("treats equal versions as equal", () => {
    expect(compareVersions("1.4.2", "1.4.2")).toBe(0);
  });

  it("does not fall back to string ordering", () => {
    // The whole reason this function exists: "1.10.0" < "1.9.0" as strings.
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(["1.9.0", "1.10.0", "1.2.0"].sort(compareVersions)).toEqual([
      "1.2.0",
      "1.9.0",
      "1.10.0",
    ]);
  });
});

describe("isValidVersion", () => {
  it.each(["1.0.0", "0.0.1", "12.54.2"])("accepts %s", (v) => {
    expect(isValidVersion(v)).toBe(true);
  });

  it.each(["1.0", "v1.0.0", "1.0.0-beta", "1.0.0.0", "", "abc"])("rejects %s", (v) => {
    expect(isValidVersion(v)).toBe(false);
  });
});
