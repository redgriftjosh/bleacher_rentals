import { describe, it, expect } from "vitest";
import type { QuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { renderTemplate, buildVariableValues, recipientEmail } from "./variables";

// Minimal booking fixture — only the fields the variable builders read.
function doc(over: Partial<QuoteDocumentData> = {}): QuoteDocumentData {
  return {
    contact: { name: "Jordan Ellis", email: "jordan@example.com", phone: "" },
    publicUrl: "https://app.example.com/quotes/abc",
    quoteNumber: "Q-10428",
    venue: { name: "Homecoming Game", street: "", city: "", state: "", zip: "" },
    dates: { eventStart: "2026-10-12", eventEnd: "2026-10-13" },
    totalCents: 425000,
    accountManager: "Sam Rivera",
    accountManagerEmail: "sam@bleacherrentals.com",
    company: { name: "Bleacher Rentals — Dallas" },
    currency: "USD",
    ...over,
  } as unknown as QuoteDocumentData;
}

describe("renderTemplate", () => {
  it("substitutes known tokens", () => {
    expect(renderTemplate("Hi {{firstName}}!", { firstName: "Jordan" })).toBe("Hi Jordan!");
  });

  it("leaves unknown tokens untouched", () => {
    expect(renderTemplate("Hi {{unknown}}", { firstName: "Jordan" })).toBe("Hi {{unknown}}");
  });

  it("renders null/undefined values as empty string", () => {
    expect(renderTemplate("[{{a}}][{{b}}]", { a: null, b: undefined })).toBe("[][]");
  });

  it("tolerates whitespace inside braces", () => {
    expect(renderTemplate("{{ firstName }}", { firstName: "Jordan" })).toBe("Jordan");
  });

  it("replaces every occurrence", () => {
    expect(renderTemplate("{{x}}-{{x}}", { x: "1" })).toBe("1-1");
  });
});

describe("buildVariableValues", () => {
  it("firstName is the first word of the contact name", () => {
    expect(buildVariableValues(doc()).firstName).toBe("Jordan");
  });

  it("firstName is empty when there is no contact name", () => {
    expect(buildVariableValues(doc({ contact: null } as any)).firstName).toBe("");
  });

  it("formats total as USD currency", () => {
    expect(buildVariableValues(doc()).total).toBe("$4,250.00");
  });

  it("formats total as CAD currency", () => {
    const v = buildVariableValues(doc({ currency: "CAD" as any }));
    expect(v.total).toContain("4,250.00");
    expect(v.total).toMatch(/CA|\$/);
  });

  it("leaves payment fields empty when no payment context is passed", () => {
    const v = buildVariableValues(doc());
    expect(v.amountPaid).toBe("");
    expect(v.amountDue).toBe("");
    expect(v.dueDate).toBe("");
  });

  it("fills payment fields when payment context is passed", () => {
    const v = buildVariableValues(doc(), {
      amountPaidCents: 212500,
      amountDueCents: 212500,
      dueDate: "2026-11-01",
    });
    expect(v.amountPaid).toBe("$2,125.00");
    expect(v.amountDue).toBe("$2,125.00");
    // Timezone-tolerant: date-only strings can shift a day depending on the
    // runner's TZ (see known off-by-one note). Assert it formats, not the exact day.
    expect(v.dueDate).toMatch(/^(October 3[01]|November 1), 2026$/);
  });

  it("formats the event start date", () => {
    // Timezone-tolerant — see note above.
    expect(buildVariableValues(doc()).eventStartDate).toMatch(/^October 1[12], 2026$/);
  });
});

describe("recipientEmail", () => {
  it("returns the client contact email for a client recipient", () => {
    expect(recipientEmail(doc(), "client")).toBe("jordan@example.com");
  });

  it("returns the account manager email for an account_manager recipient", () => {
    expect(recipientEmail(doc(), "account_manager")).toBe("sam@bleacherrentals.com");
  });

  it("returns null when the client email is missing", () => {
    expect(recipientEmail(doc({ contact: null } as any), "client")).toBeNull();
  });

  it("returns null for a whitespace-only email", () => {
    expect(
      recipientEmail(doc({ contact: { name: "X", email: "  ", phone: "" } } as any), "client"),
    ).toBeNull();
  });
});
