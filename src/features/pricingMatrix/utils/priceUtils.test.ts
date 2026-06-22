import { describe, it, expect } from "vitest";
import {
  centsToDollars,
  dollarsToCents,
  formatPriceDollars,
  buildMatrixKey,
  buildPriceMap,
} from "./priceUtils";

describe("centsToDollars", () => {
  it("converts cents to dollar string", () => {
    expect(centsToDollars(220000)).toBe("2200.00");
    expect(centsToDollars(0)).toBe("0.00");
    expect(centsToDollars(99)).toBe("0.99");
    expect(centsToDollars(150)).toBe("1.50");
  });
});

describe("dollarsToCents", () => {
  it("converts dollar string to cents", () => {
    expect(dollarsToCents("2200.00")).toBe(220000);
    expect(dollarsToCents("0.99")).toBe(99);
    expect(dollarsToCents("1.50")).toBe(150);
  });

  it("handles commas and $ signs", () => {
    expect(dollarsToCents("$2,200.00")).toBe(220000);
    expect(dollarsToCents("C$1,500.50")).toBe(150050);
  });

  it("returns 0 for invalid input", () => {
    expect(dollarsToCents("")).toBe(0);
    expect(dollarsToCents("abc")).toBe(0);
  });

  it("rounds to nearest cent", () => {
    expect(dollarsToCents("1.999")).toBe(200);
    expect(dollarsToCents("1.001")).toBe(100);
  });
});

describe("formatPriceDollars", () => {
  it("formats USD", () => {
    expect(formatPriceDollars(220000, "USD")).toBe("$2,200.00");
    expect(formatPriceDollars(99, "USD")).toBe("$0.99");
  });

  it("formats CAD", () => {
    expect(formatPriceDollars(220000, "CAD")).toBe("C$2,200.00");
  });

  it("defaults to USD", () => {
    expect(formatPriceDollars(100)).toBe("$1.00");
  });
});

describe("buildMatrixKey", () => {
  it("builds colon-separated key", () => {
    expect(buildMatrixKey("dur1", "et1", "USD")).toBe("dur1:et1:USD");
  });
});

describe("buildPriceMap", () => {
  it("builds map from price rows", () => {
    const prices = [
      { price_duration_uuid: "d1", event_type_uuid: "e1", currency: "USD", price_cents: 100 },
      { price_duration_uuid: "d2", event_type_uuid: "e1", currency: "CAD", price_cents: 200 },
    ];
    const map = buildPriceMap(prices);
    expect(map.size).toBe(2);
    expect(map.get("d1:e1:USD")).toBe(100);
    expect(map.get("d2:e1:CAD")).toBe(200);
  });

  it("skips rows with null fields", () => {
    const prices = [
      { price_duration_uuid: null, event_type_uuid: "e1", currency: "USD", price_cents: 100 },
      { price_duration_uuid: "d1", event_type_uuid: null, currency: "USD", price_cents: 100 },
      { price_duration_uuid: "d1", event_type_uuid: "e1", currency: null, price_cents: 100 },
      { price_duration_uuid: "d1", event_type_uuid: "e1", currency: "USD", price_cents: null },
    ];
    const map = buildPriceMap(prices);
    expect(map.size).toBe(0);
  });
});
