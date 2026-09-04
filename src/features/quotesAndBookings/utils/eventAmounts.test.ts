import { describe, it, expect } from "vitest";
import { eventSubtotalCents, eventTaxCents, sumSubtotalCents, sumTaxCents } from "./eventAmounts";

const event = (
  contract_revenue_cents: number | null,
  tax_amount_cents: number | null,
  tax_percent: number | null = null,
) => ({ contract_revenue_cents, tax_amount_cents, tax_percent });

describe("eventAmounts", () => {
  it("splits the stored total into subtotal and tax", () => {
    const e = event(107500, 7500);
    expect(eventSubtotalCents(e)).toBe(100000);
    expect(eventTaxCents(e)).toBe(7500);
  });

  it("prefers the stored tax amount over the percent", () => {
    // A manual tax override is stored in cents and must win over the rate.
    const e = event(107500, 7500, 10);
    expect(eventTaxCents(e)).toBe(7500);
    expect(eventSubtotalCents(e)).toBe(100000);
  });

  it("backs the tax out of the total when only a percent is stored", () => {
    // 100000 + 7.5% = 107500, so a 7.5% rate on the total yields 7500 of tax.
    const e = event(107500, null, 7.5);
    expect(eventTaxCents(e)).toBe(7500);
    expect(eventSubtotalCents(e)).toBe(100000);
  });

  it("rounds the backed-out tax to whole cents and keeps the two parts summing to the total", () => {
    const e = event(100000, null, 8.25);
    expect(eventTaxCents(e)).toBe(7621);
    expect(eventSubtotalCents(e)).toBe(92379);
    expect(eventSubtotalCents(e) + eventTaxCents(e)).toBe(100000);
  });

  it("treats a zero percent as no tax", () => {
    const e = event(100000, null, 0);
    expect(eventTaxCents(e)).toBe(0);
    expect(eventSubtotalCents(e)).toBe(100000);
  });

  it("treats a missing tax as zero, so subtotal equals the total", () => {
    const e = event(100000, null);
    expect(eventSubtotalCents(e)).toBe(100000);
    expect(eventTaxCents(e)).toBe(0);
  });

  it("treats a missing total as zero even when a percent is stored", () => {
    const e = event(null, null, 7.5);
    expect(eventSubtotalCents(e)).toBe(0);
    expect(eventTaxCents(e)).toBe(0);
  });

  it("ignores a nonsensical percent instead of producing a negative subtotal", () => {
    const e = event(100000, null, -5);
    expect(eventTaxCents(e)).toBe(0);
    expect(eventSubtotalCents(e)).toBe(100000);
  });

  it("sums subtotals and taxes across events, whichever way tax is stored", () => {
    const events = [
      event(107500, 7500),
      event(107500, null, 7.5),
      event(50000, 0),
      event(null, null),
    ];
    expect(sumSubtotalCents(events)).toBe(250000);
    expect(sumTaxCents(events)).toBe(15000);
  });

  it("handles a missing list", () => {
    expect(sumSubtotalCents(null)).toBe(0);
    expect(sumTaxCents(undefined)).toBe(0);
  });
});
