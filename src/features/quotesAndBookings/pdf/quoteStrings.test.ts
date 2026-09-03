import { describe, it, expect } from "vitest";
import { quoteStrings, quoteText, statusLabel, paymentMethodLabel } from "./quoteStrings";

const entries = Object.entries(quoteStrings);

describe("quoteStrings dictionary", () => {
  it("has an English and a French value for every entry", () => {
    const incomplete = entries.filter(
      ([, entry]) => entry.en === undefined || entry.fr === undefined,
    );
    expect(incomplete.map(([key]) => key)).toEqual([]);
  });

  it("gives both languages the same shape — text or interpolating function, never mixed", () => {
    const mismatched = entries.filter(([, entry]) => typeof entry.en !== typeof entry.fr);
    expect(mismatched.map(([key]) => key)).toEqual([]);
  });

  it("has no blank values", () => {
    const blank = entries.filter(
      ([, entry]) =>
        (typeof entry.en === "string" && entry.en.trim() === "") ||
        (typeof entry.fr === "string" && entry.fr.trim() === ""),
    );
    expect(blank.map(([key]) => key)).toEqual([]);
  });

  it("actually translates — French is not a copy of English", () => {
    // A handful of words are genuinely identical in both languages. Everything
    // else being identical means a translation was forgotten.
    const legitimatelyIdentical = new Set([
      "colDescription",
      "colTotal",
      "total",
      "grandTotal",
      "totalWithAsterisk",
      "notes",
      "signature",
      "signatureDate",
      "colDate",
    ]);
    const untranslated = entries
      .filter(([key, entry]) => typeof entry.en === "string" && entry.en === entry.fr)
      .map(([key]) => key)
      .filter((key) => !legitimatelyIdentical.has(key));
    expect(untranslated).toEqual([]);
  });
});

describe("quoteText", () => {
  it("resolves plain phrases to the requested language", () => {
    expect(quoteText("en").subtotal).toBe("Subtotal");
    expect(quoteText("fr").subtotal).toBe("Sous-total");
  });

  it("resolves interpolating phrases to the requested language", () => {
    expect(quoteText("en").taxWithPercent(5)).toBe("Tax (5%)");
    expect(quoteText("fr").taxWithPercent(5)).toBe("Taxes (5 %)");
    expect(quoteText("en").invoiceNumber("INV-1")).toBe("Invoice #INV-1");
    expect(quoteText("fr").invoiceNumber("INV-1")).toContain("INV-1");
  });

  it("returns a stable object per language so components can rely on identity", () => {
    expect(quoteText("fr")).toBe(quoteText("fr"));
    expect(quoteText("fr")).not.toBe(quoteText("en"));
  });
});

describe("statusLabel / paymentMethodLabel", () => {
  it("translates known statuses", () => {
    expect(statusLabel("en", "succeeded")).toBe("succeeded");
    expect(statusLabel("fr", "succeeded")).toBe("réussi");
    expect(statusLabel("fr", "paid")).toBe("payé");
  });

  it("passes unknown statuses through rather than rendering blank", () => {
    expect(statusLabel("fr", "requires_action")).toBe("requires_action");
    expect(statusLabel("en", "")).toBe("");
  });

  it("translates known payment methods and passes the rest through", () => {
    expect(paymentMethodLabel("fr", "card")).toBe("carte");
    expect(paymentMethodLabel("fr", "acss_debit")).toBe("acss_debit");
  });
});

describe("no word tells a client they are late", () => {
  /**
   * An installment is flagged the moment its due date arrives, so the client
   * sees this wording on day one — while they are perfectly on time. Say what
   * is owed, never that it is late.
   *
   * noHardcodedText.test.ts guarantees every customer-facing word comes from
   * this dictionary, so checking the dictionary checks the whole quote.
   */
  const BANNED = ["overdue", "en souffrance", "en retard"];

  it.each(BANNED)("never says %s", (word) => {
    const offenders = entries
      .filter(([, entry]) =>
        (["en", "fr"] as const).some(
          (lang) => typeof entry[lang] === "string" && entry[lang].toLowerCase().includes(word),
        ),
      )
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });
});
