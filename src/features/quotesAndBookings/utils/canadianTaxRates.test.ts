import { describe, expect, it } from "vitest";
import {
  getCanadianTaxLabel,
  getCanadianTaxPercent,
  isCanadianProvince,
  normalizeCanadianProvince,
} from "./canadianTaxRates";

describe("normalizeCanadianProvince", () => {
  it("accepts two-letter codes", () => {
    expect(normalizeCanadianProvince("ON")).toBe("ON");
    expect(normalizeCanadianProvince("QC")).toBe("QC");
  });

  it("accepts full names, which is what address autocomplete returns", () => {
    expect(normalizeCanadianProvince("Ontario")).toBe("ON");
    expect(normalizeCanadianProvince("British Columbia")).toBe("BC");
  });

  it("is case and whitespace insensitive", () => {
    expect(normalizeCanadianProvince("  ontario  ")).toBe("ON");
    expect(normalizeCanadianProvince("on")).toBe("ON");
  });

  it("handles accented and abbreviated spellings", () => {
    expect(normalizeCanadianProvince("Québec")).toBe("QC");
    expect(normalizeCanadianProvince("PEI")).toBe("PE");
  });

  it("returns null for US states and blanks", () => {
    expect(normalizeCanadianProvince("California")).toBeNull();
    expect(normalizeCanadianProvince("CA")).toBeNull();
    expect(normalizeCanadianProvince("")).toBeNull();
    expect(normalizeCanadianProvince("   ")).toBeNull();
    expect(normalizeCanadianProvince(null)).toBeNull();
    expect(normalizeCanadianProvince(undefined)).toBeNull();
  });
});

describe("getCanadianTaxPercent", () => {
  it("returns the HST rate for Ontario", () => {
    expect(getCanadianTaxPercent("Ontario")).toBe(13);
    expect(getCanadianTaxPercent("ON")).toBe(13);
  });

  it("combines GST and QST for Quebec without compounding", () => {
    // 5% GST + 9.975% QST, both applied to the pre-tax amount.
    expect(getCanadianTaxPercent("QC")).toBe(14.975);
  });

  it("returns GST only for territories and Alberta", () => {
    for (const p of ["AB", "NT", "NU", "YT"]) {
      expect(getCanadianTaxPercent(p)).toBe(5);
    }
  });

  it("combines GST and PST for BC, MB and SK", () => {
    expect(getCanadianTaxPercent("BC")).toBe(12);
    expect(getCanadianTaxPercent("MB")).toBe(12);
    expect(getCanadianTaxPercent("SK")).toBe(11);
  });

  it("uses the post-2025 Nova Scotia rate", () => {
    expect(getCanadianTaxPercent("NS")).toBe(14);
  });

  it("returns null rather than 0 for non-Canadian provinces", () => {
    // Null must mean "not the Canadian case" so the caller falls through to the
    // US lookup. Returning 0 here would silently zero out US tax.
    expect(getCanadianTaxPercent("California")).toBeNull();
    expect(getCanadianTaxPercent("TX")).toBeNull();
  });
});

describe("isCanadianProvince", () => {
  it("agrees with the rate lookup", () => {
    expect(isCanadianProvince("Ontario")).toBe(true);
    expect(isCanadianProvince("Texas")).toBe(false);
    expect(isCanadianProvince(null)).toBe(false);
  });
});

describe("getCanadianTaxLabel", () => {
  it("describes the component parts", () => {
    expect(getCanadianTaxLabel("QC")).toBe("GST 5% + QST 9.975%");
    expect(getCanadianTaxLabel("ON")).toBe("HST 13%");
  });

  it("returns null for non-Canadian provinces", () => {
    expect(getCanadianTaxLabel("Nevada")).toBeNull();
  });
});
