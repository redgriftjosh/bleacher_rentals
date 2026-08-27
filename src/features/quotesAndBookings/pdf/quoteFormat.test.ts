import { describe, it, expect } from "vitest";
import {
  formatQuoteDate,
  formatQuoteDateRange,
  formatQuoteDateTime,
  formatQuoteMoney,
} from "./quoteFormat";

// Pin a timezone so UTC→local conversion is deterministic regardless of the
// machine running the tests. America/New_York is EST (UTC-5) in winter and EDT
// (UTC-4) in summer, which also exercises DST handling.
const NY = "America/New_York";

// fr-CA groups thousands with a no-break space; write it explicitly so a plain
// space slipping into the formatter fails the test instead of passing quietly.
const NBSP = " ";

describe("formatQuoteDate", () => {
  it("renders English exactly as the quote always has", () => {
    expect(formatQuoteDate("2026-01-15", "en")).toBe("Jan 15, 2026");
  });

  it("renders Canadian French", () => {
    expect(formatQuoteDate("2026-01-15", "fr")).toBe("15 janv. 2026");
  });

  it("pins a bare date to local midnight so it never slips a day", () => {
    // Would render as Jan 14 if parsed as UTC in a western timezone.
    expect(formatQuoteDate("2026-01-15", "en")).toContain("15");
  });

  it("accepts a full timestamp as well as a bare date (payment history rows)", () => {
    expect(formatQuoteDate("2026-01-15T18:00:00Z", "en")).toBe("Jan 15, 2026");
  });

  it("shows an em dash for a missing or unparseable date", () => {
    expect(formatQuoteDate("", "en")).toBe("—");
    expect(formatQuoteDate("", "fr")).toBe("—");
    expect(formatQuoteDate("not-a-date", "en")).toBe("—");
  });
});

describe("formatQuoteDateTime", () => {
  // These three cases moved here from SignContractTab.test.ts along with the
  // formatSignedAt helper they covered.
  it("converts a UTC instant to the given local timezone (EDT / summer)", () => {
    expect(formatQuoteDateTime("2026-06-10T14:30:00Z", "en", NY)).toBe(
      "Jun 10, 2026, 10:30 AM EDT",
    );
  });

  it("rolls back to the previous day when local time is behind UTC (EST / winter)", () => {
    expect(formatQuoteDateTime("2026-01-01T00:00:00Z", "en", NY)).toBe("Dec 31, 2025, 7:00 PM EST");
  });

  it("includes a timezone abbreviation", () => {
    expect(formatQuoteDateTime("2026-06-10T14:30:00Z", "en", NY)).toContain("EDT");
  });

  it("renders a French signature timestamp on the same instant", () => {
    const fr = formatQuoteDateTime("2026-06-10T14:30:00Z", "fr", NY);
    expect(fr).toContain("10 juin 2026");
    expect(fr).toContain("10");
    expect(fr).not.toContain("Jun");
  });
});

describe("formatQuoteDateRange", () => {
  it("renders the English range unchanged", () => {
    expect(formatQuoteDateRange("2026-01-18", "2026-01-19", "en")).toBe(
      "Sunday, Jan 18 - Monday, Jan 19, 2026",
    );
  });

  it("renders the French range without the English comma convention", () => {
    expect(formatQuoteDateRange("2026-01-18", "2026-01-19", "fr")).toBe(
      "dimanche 18 janv. - lundi 19 janv. 2026",
    );
  });

  it("shows an em dash when either end is missing", () => {
    expect(formatQuoteDateRange("", "2026-01-19", "en")).toBe("—");
    expect(formatQuoteDateRange("2026-01-18", "", "fr")).toBe("—");
  });
});

describe("formatQuoteMoney", () => {
  it("renders English with a leading dollar sign, unchanged", () => {
    expect(formatQuoteMoney(123456, "USD", "en")).toBe("$1,234.56");
    expect(formatQuoteMoney(50, "USD", "en")).toBe("$0.50");
    expect(formatQuoteMoney(0, "USD", "en")).toBe("$0.00");
  });

  it("renders CAD identically to USD in English (bare $, no CA prefix)", () => {
    expect(formatQuoteMoney(123456, "CAD", "en")).toBe("$1,234.56");
  });

  it("renders French with a comma decimal and a trailing dollar sign", () => {
    expect(formatQuoteMoney(123456, "CAD", "fr")).toBe(`1${NBSP}234,56${NBSP}$`);
    expect(formatQuoteMoney(50, "CAD", "fr")).toBe(`0,50${NBSP}$`);
  });

  it("keeps the minus sign in front in both languages", () => {
    expect(formatQuoteMoney(-123456, "USD", "en")).toBe("-$1,234.56");
    expect(formatQuoteMoney(-123456, "CAD", "fr")).toBe(`-1${NBSP}234,56${NBSP}$`);
  });

  it("groups amounts over a million", () => {
    expect(formatQuoteMoney(123456789, "USD", "en")).toBe("$1,234,567.89");
    expect(formatQuoteMoney(123456789, "CAD", "fr")).toBe(`1${NBSP}234${NBSP}567,89${NBSP}$`);
  });
});
