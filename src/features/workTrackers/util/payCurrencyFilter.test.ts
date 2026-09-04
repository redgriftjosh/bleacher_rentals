import { describe, it, expect } from "vitest";
import {
  matchesPayCurrency,
  normalizePayCurrency,
  parsePayCurrencyFilter,
} from "./payCurrencyFilter";

describe("normalizePayCurrency", () => {
  it("keeps a known currency", () => {
    expect(normalizePayCurrency("CAD")).toBe("CAD");
    expect(normalizePayCurrency("USD")).toBe("USD");
  });

  it("normalises casing and whitespace", () => {
    expect(normalizePayCurrency(" cad ")).toBe("CAD");
  });

  it("falls back to USD for missing or unknown values", () => {
    expect(normalizePayCurrency(null)).toBe("USD");
    expect(normalizePayCurrency(undefined)).toBe("USD");
    expect(normalizePayCurrency("")).toBe("USD");
    expect(normalizePayCurrency("EUR")).toBe("USD");
  });
});

describe("parsePayCurrencyFilter", () => {
  it("accepts the two currencies", () => {
    expect(parsePayCurrencyFilter("CAD")).toBe("CAD");
    expect(parsePayCurrencyFilter("USD")).toBe("USD");
  });

  it("treats anything else as no filter", () => {
    expect(parsePayCurrencyFilter("")).toBe("ALL");
    expect(parsePayCurrencyFilter("ALL")).toBe("ALL");
    expect(parsePayCurrencyFilter("cad")).toBe("ALL");
  });
});

describe("matchesPayCurrency", () => {
  it("lets everything through when no currency is selected", () => {
    expect(matchesPayCurrency("CAD", "ALL")).toBe(true);
    expect(matchesPayCurrency(null, "ALL")).toBe(true);
  });

  it("matches on the driver's currency", () => {
    expect(matchesPayCurrency("CAD", "CAD")).toBe(true);
    expect(matchesPayCurrency("CAD", "USD")).toBe(false);
    expect(matchesPayCurrency("USD", "USD")).toBe(true);
  });

  it("counts a driver without a currency as USD, matching how the row renders", () => {
    expect(matchesPayCurrency(null, "USD")).toBe(true);
    expect(matchesPayCurrency(null, "CAD")).toBe(false);
  });
});
