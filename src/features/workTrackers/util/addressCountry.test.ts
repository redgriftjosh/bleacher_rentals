import { describe, expect, it } from "vitest";
import { deriveRegion, isCanadianAddress, isUsaAddress } from "./addressCountry";

describe("isUsaAddress", () => {
  it("trusts the country column outright", () => {
    expect(isUsaAddress("US", null)).toBe(true);
    expect(isUsaAddress("CA", null)).toBe(false);
  });

  it("a set country wins even when street would suggest otherwise", () => {
    // An address never gets both — this just proves country is trusted
    // outright rather than street ever overriding it.
    expect(isUsaAddress("CA", "123 Main St, Somewhere, USA")).toBe(false);
  });

  it("falls back to a street regex when country is unset (legacy, never re-saved)", () => {
    expect(isUsaAddress(null, "123 Main St, Buffalo, NY, USA")).toBe(true);
    expect(isUsaAddress(null, "123 Main St, Buffalo, United States")).toBe(true);
    expect(isUsaAddress(null, "123 Main St, Toronto, ON, Canada")).toBe(false);
  });

  it("is false with neither a country nor a street", () => {
    expect(isUsaAddress(null, null)).toBe(false);
  });
});

describe("isCanadianAddress", () => {
  it("trusts the country column outright", () => {
    expect(isCanadianAddress("CA", null)).toBe(true);
    expect(isCanadianAddress("US", null)).toBe(false);
  });

  it("falls back to a street regex when country is unset", () => {
    expect(isCanadianAddress(null, "123 Main St, Toronto, ON, Canada")).toBe(true);
    expect(isCanadianAddress(null, "123 Main St, Buffalo, NY, USA")).toBe(false);
  });
});

describe("deriveRegion", () => {
  it("prefers the country column", () => {
    expect(deriveRegion("US", null)).toBe("US");
    expect(deriveRegion("CA", null)).toBe("CAN");
  });

  it("is null for a country outside US/CA", () => {
    expect(deriveRegion("MX", null)).toBeNull();
  });

  it("falls back to the street regex", () => {
    expect(deriveRegion(null, "123 Main St, Buffalo, NY, USA")).toBe("US");
    expect(deriveRegion(null, "123 Main St, Toronto, ON, Canada")).toBe("CAN");
  });

  it("is null with neither a country nor a recognizable street", () => {
    expect(deriveRegion(null, null)).toBeNull();
    expect(deriveRegion(null, "123 Main St, Somewhere")).toBeNull();
  });
});
