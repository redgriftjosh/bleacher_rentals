import { describe, it, expect } from "vitest";
import { parseAmountInput, MAX_PAYMENT_CENTS } from "./parseAmountInput";

/** Terser assertions — a parse either yields cents or a reason, never both. */
const cents = (raw: string) => {
  const result = parseAmountInput(raw);
  if (!result.ok) throw new Error(`expected "${raw}" to parse, got ${result.reason}`);
  return result.cents;
};
const reason = (raw: string) => {
  const result = parseAmountInput(raw);
  if (result.ok) throw new Error(`expected "${raw}" to fail, got ${result.cents}`);
  return result.reason;
};

describe("parseAmountInput", () => {
  describe("positive amounts", () => {
    it("parses a plain decimal", () => {
      expect(cents("12.34")).toBe(1234);
    });

    it("parses whole dollars", () => {
      expect(cents("150")).toBe(15000);
    });

    it("parses thousands separators", () => {
      expect(cents("1,234.56")).toBe(123456);
    });

    it("parses a currency symbol", () => {
      expect(cents("$2,700.00")).toBe(270000);
    });

    it("ignores surrounding whitespace", () => {
      expect(cents("  42.50  ")).toBe(4250);
    });

    it("accepts a bare leading decimal point", () => {
      expect(cents(".50")).toBe(50);
    });

    it("accepts a trailing decimal point", () => {
      expect(cents("50.")).toBe(5000);
    });

    it("accepts an explicit plus sign", () => {
      expect(cents("+12.34")).toBe(1234);
    });
  });

  describe("negative amounts — the mechanism this feature runs on", () => {
    it("parses a leading minus", () => {
      expect(cents("-12.34")).toBe(-1234);
    });

    it("parses accounting parentheses", () => {
      expect(cents("(12.34)")).toBe(-1234);
    });

    it("parses parentheses with a currency symbol", () => {
      expect(cents("($12.00)")).toBe(-1200);
    });

    it("parses a minus after the currency symbol", () => {
      expect(cents("$-5")).toBe(-500);
    });

    it("parses a large negative with separators", () => {
      expect(cents("-2,700.00")).toBe(-270000);
    });
  });

  describe("zero — rejected, matching the DB constraint", () => {
    it.each(["0", "0.00", "-0", "(0)", "$0.00", "0.004"])("rejects %s", (raw) => {
      expect(reason(raw)).toBe("zero");
    });
  });

  describe("empty", () => {
    it.each(["", "   ", "$", "()"])("reports %s as empty", (raw) => {
      expect(reason(raw)).toBe("empty");
    });
  });

  describe("not a number", () => {
    it.each(["abc", "1.2.3", "--5", "1-2", "-", ".", "12a", "1 2"])("rejects %s", (raw) => {
      expect(reason(raw)).toBe("not-a-number");
    });
  });

  describe("rounding — half-up on the magnitude, sign applied after", () => {
    it("rounds a third decimal up at the half", () => {
      expect(cents("12.345")).toBe(1235);
    });

    it("rounds below the half down", () => {
      expect(cents("12.344")).toBe(1234);
    });

    it("rounds a negative away from zero at the half", () => {
      expect(cents("-12.345")).toBe(-1235);
    });

    it("rounds a long fraction", () => {
      expect(cents("0.999")).toBe(100);
    });
  });

  describe("the typo guard", () => {
    it("accepts exactly the cap", () => {
      expect(cents("1000000")).toBe(MAX_PAYMENT_CENTS);
    });

    it("accepts exactly the negative cap", () => {
      expect(cents("-1000000")).toBe(-MAX_PAYMENT_CENTS);
    });

    it("rejects one cent over the cap", () => {
      expect(reason("1000000.01")).toBe("too-large");
    });

    it("rejects a seven-figure typo", () => {
      expect(reason("9999999")).toBe("too-large");
    });

    it("rejects a negative beyond the cap", () => {
      expect(reason("-9999999")).toBe("too-large");
    });
  });

  describe("float drift must not appear", () => {
    // 0.1 + 0.2 territory: these are the values that betray a
    // parseFloat(raw) * 100 implementation.
    it.each([
      ["0.1", 10],
      ["0.2", 20],
      ["0.3", 30],
      ["0.07", 7],
      ["1.005", 101],
      ["8.29", 829],
      ["1234.56", 123456],
      ["-8.29", -829],
    ])("parses %s exactly", (raw, expected) => {
      expect(cents(raw as string)).toBe(expected);
    });
  });

  it("is pure — the same input always gives the same answer", () => {
    expect(parseAmountInput("(1,234.56)")).toEqual(parseAmountInput("(1,234.56)"));
  });
});
