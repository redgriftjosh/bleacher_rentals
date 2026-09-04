import { describe, it, expect } from "vitest";
import { formatMoney, currencySymbol } from "./formatMoney";
import { formatCurrency } from "./formatCurrency";

/**
 * Canadian amounts have to *look* Canadian. Rendering CAD as a bare "$" is what
 * let a C$1,000.00 quote read as $1,000.00 on every internal screen, which is a
 * 30-odd percent difference nobody can see.
 */
describe("formatMoney", () => {
  it("renders USD exactly as before", () => {
    expect(formatMoney(123456, "USD")).toBe("$1,234.56");
    expect(formatMoney(0, "USD")).toBe("$0.00");
    expect(formatMoney(-123456, "USD")).toBe("-$1,234.56");
  });

  it("marks CAD with a C$ symbol", () => {
    expect(formatMoney(123456, "CAD")).toBe("C$1,234.56");
    expect(formatMoney(50, "CAD")).toBe("C$0.50");
    expect(formatMoney(-123456, "CAD")).toBe("-C$1,234.56");
  });

  it("defaults to USD when no currency is known", () => {
    expect(formatMoney(100)).toBe("$1.00");
  });

  it("groups thousands", () => {
    expect(formatMoney(123456789, "CAD")).toBe("C$1,234,567.89");
  });
});

describe("currencySymbol", () => {
  it("gives the symbol used as an input prefix", () => {
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("CAD")).toBe("C$");
  });
});

describe("formatCurrency (dollars)", () => {
  it("agrees with formatMoney on the same amount", () => {
    expect(formatCurrency(1234.56, "CAD")).toBe("C$1,234.56");
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
    expect(formatCurrency(-99.5, "CAD")).toBe("-C$99.50");
  });
});
