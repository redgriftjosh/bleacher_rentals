import { describe, it, expect } from "vitest";
import {
  resolveInvoiceDisplay,
  buildPublicQuoteUrl,
  parseInvoiceParam,
} from "./invoiceNumber";

const UUID = "3046c181-fc56-4dfe-8f73-75a7018ce208";
const INVOICE = 136287131;

describe("resolveInvoiceDisplay", () => {
  it("returns invoice number as string when present", () => {
    expect(resolveInvoiceDisplay(INVOICE, UUID)).toBe("136287131");
  });

  it("falls back to eventId when invoice_number is null", () => {
    expect(resolveInvoiceDisplay(null, UUID)).toBe(UUID);
  });

  it("falls back to eventId when invoice_number is undefined", () => {
    expect(resolveInvoiceDisplay(undefined, UUID)).toBe(UUID);
  });

  it("falls back to eventId when invoice_number is 0", () => {
    // 0 is falsy — treated as missing
    expect(resolveInvoiceDisplay(0, UUID)).toBe(UUID);
  });

  it("handles large 9-digit numbers", () => {
    expect(resolveInvoiceDisplay(999999999, UUID)).toBe("999999999");
  });

  it("handles smallest 9-digit number", () => {
    expect(resolveInvoiceDisplay(100000000, UUID)).toBe("100000000");
  });
});

describe("buildPublicQuoteUrl", () => {
  const origin = "https://app.bleacherrentals.com";

  it("uses invoice number in URL when available", () => {
    expect(buildPublicQuoteUrl(origin, INVOICE, UUID)).toBe(
      "https://app.bleacherrentals.com/quote/136287131",
    );
  });

  it("falls back to UUID in URL when no invoice number", () => {
    expect(buildPublicQuoteUrl(origin, null, UUID)).toBe(
      `https://app.bleacherrentals.com/quote/${UUID}`,
    );
  });

  it("works with localhost origin", () => {
    expect(buildPublicQuoteUrl("http://localhost:3000", INVOICE, UUID)).toBe(
      "http://localhost:3000/quote/136287131",
    );
  });
});

describe("parseInvoiceParam", () => {
  it("parses numeric string as invoice_number", () => {
    expect(parseInvoiceParam("136287131")).toEqual({
      type: "invoice_number",
      value: 136287131,
    });
  });

  it("parses UUID string as uuid", () => {
    expect(parseInvoiceParam(UUID)).toEqual({
      type: "uuid",
      value: UUID,
    });
  });

  it("parses 9-digit number correctly", () => {
    expect(parseInvoiceParam("100000000")).toEqual({
      type: "invoice_number",
      value: 100000000,
    });
  });

  it("treats float-like string as uuid (not a valid invoice number)", () => {
    expect(parseInvoiceParam("123.456")).toEqual({
      type: "uuid",
      value: "123.456",
    });
  });

  it("treats empty string as uuid", () => {
    expect(parseInvoiceParam("")).toEqual({
      type: "uuid",
      value: "",
    });
  });

  it("treats alphabetic string as uuid", () => {
    expect(parseInvoiceParam("abc123")).toEqual({
      type: "uuid",
      value: "abc123",
    });
  });

  it("treats string with leading zeros as uuid (Number strips them)", () => {
    // "007" → Number("007") = 7, String(7) = "7" ≠ "007" → uuid
    expect(parseInvoiceParam("007")).toEqual({
      type: "uuid",
      value: "007",
    });
  });

  it("handles max safe integer range", () => {
    expect(parseInvoiceParam("999999999")).toEqual({
      type: "invoice_number",
      value: 999999999,
    });
  });
});
