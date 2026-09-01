import { describe, it, expect } from "vitest";
import { eventSubtotalCents, eventTaxCents, sumSubtotalCents, sumTaxCents } from "./eventAmounts";

const event = (contract_revenue_cents: number | null, tax_amount_cents: number | null) => ({
  contract_revenue_cents,
  tax_amount_cents,
});

describe("eventAmounts", () => {
  it("splits the stored total into subtotal and tax", () => {
    const e = event(107500, 7500);
    expect(eventSubtotalCents(e)).toBe(100000);
    expect(eventTaxCents(e)).toBe(7500);
  });

  it("treats a missing tax as zero, so subtotal equals the total", () => {
    const e = event(100000, null);
    expect(eventSubtotalCents(e)).toBe(100000);
    expect(eventTaxCents(e)).toBe(0);
  });

  it("treats a missing total as zero", () => {
    const e = event(null, null);
    expect(eventSubtotalCents(e)).toBe(0);
    expect(eventTaxCents(e)).toBe(0);
  });

  it("sums subtotals and taxes across events", () => {
    const events = [event(107500, 7500), event(50000, 0), event(null, null)];
    expect(sumSubtotalCents(events)).toBe(150000);
    expect(sumTaxCents(events)).toBe(7500);
  });

  it("handles a missing list", () => {
    expect(sumSubtotalCents(null)).toBe(0);
    expect(sumTaxCents(undefined)).toBe(0);
  });
});
