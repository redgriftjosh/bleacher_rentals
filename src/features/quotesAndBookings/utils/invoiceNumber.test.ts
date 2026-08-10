import { describe, it, expect } from "vitest";
import { resolveInvoiceDisplay, buildPublicQuoteUrl } from "./invoiceNumber";

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

  it("always uses the event UUID as the slug (never the invoice number)", () => {
    expect(buildPublicQuoteUrl(origin, UUID)).toBe(
      `https://app.bleacherrentals.com/quote/${UUID}`,
    );
  });

  it("works with a localhost origin", () => {
    expect(buildPublicQuoteUrl("http://localhost:3000", UUID)).toBe(
      `http://localhost:3000/quote/${UUID}`,
    );
  });
});
