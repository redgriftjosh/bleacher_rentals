import { describe, it, expect } from "vitest";
import {
  buildPocContactOptions,
  contactDisplayName,
  describePocPopulateResult,
  resolvePocTriggerLabel,
  type PocContact,
} from "./pocField";

const contact = (over: Partial<PocContact> = {}): PocContact => ({
  id: "c-1",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@acme.com",
  phone: "+1 555 0100",
  companyUuid: "co-1",
  companyName: "Acme Corp",
  ...over,
});

describe("contactDisplayName", () => {
  it("joins first and last name", () => {
    expect(contactDisplayName(contact())).toBe("Jane Smith");
  });

  it("omits a missing last name without leaving a trailing space", () => {
    expect(contactDisplayName(contact({ lastName: null }))).toBe("Jane");
  });
});

describe("buildPocContactOptions", () => {
  it("labels an option with the name and the email", () => {
    const [option] = buildPocContactOptions([contact()]);

    expect(option.value).toBe("c-1");
    expect(option.label).toBe("Jane Smith — jane@acme.com");
  });

  it("labels with the name alone when there is no email", () => {
    const [option] = buildPocContactOptions([contact({ email: null })]);

    expect(option.label).toBe("Jane Smith");
  });

  it("makes a contact findable by email, phone and company name", () => {
    const [option] = buildPocContactOptions([contact()]);

    expect(option.searchValue).toContain("jane@acme.com");
    expect(option.searchValue).toContain("+1 555 0100");
    expect(option.searchValue).toContain("Acme Corp");
  });
});

describe("resolvePocTriggerLabel", () => {
  const contacts = [contact()];

  it("shows the contact name when the field is linked", () => {
    expect(resolvePocTriggerLabel("c-1", "Jane Smith", contacts)).toBe("Jane Smith");
  });

  it("follows a renamed contact rather than the stored text", () => {
    const renamed = [contact({ lastName: "Newname" })];

    expect(resolvePocTriggerLabel("c-1", "Jane Smith", renamed)).toBe("Jane Newname");
  });

  it("falls back to the stored text when the linked contact is gone", () => {
    expect(resolvePocTriggerLabel("c-deleted", "Jane Smith", contacts)).toBe("Jane Smith");
  });

  it("shows legacy free text when there is no link at all", () => {
    expect(resolvePocTriggerLabel(null, "Bob from the school", contacts)).toBe(
      "Bob from the school",
    );
  });

  it("returns null when the field is empty, so the placeholder shows", () => {
    expect(resolvePocTriggerLabel(null, null, contacts)).toBeNull();
    expect(resolvePocTriggerLabel(null, "   ", contacts)).toBeNull();
  });
});

describe("describePocPopulateResult", () => {
  it("applies a linked contact", () => {
    const result = describePocPopulateResult(
      { kind: "contact", contactUuid: "c-1", displayName: "Jane Smith", source: "event" },
      "past",
    );

    expect(result).toEqual({
      kind: "apply",
      value: { contactUuid: "c-1", pocText: "Jane Smith" },
    });
  });

  it("refuses a legacy free-text POC and names it in the message", () => {
    const result = describePocPopulateResult(
      { kind: "unlinked", displayName: "Bob from the school", source: "workTracker" },
      "past",
    );

    expect(result.kind).toBe("error");
    expect(result.kind === "error" && result.messages.join(" ")).toContain("Bob from the school");
    expect(result.kind === "error" && result.messages.join(" ")).toMatch(/create a contact/i);
  });

  it("reports an empty result", () => {
    const result = describePocPopulateResult(null, "past");

    expect(result.kind).toBe("error");
    expect(result.kind === "error" && result.messages[0]).toMatch(/previous event/i);
  });

  it("says 'next event' when looking forward", () => {
    const result = describePocPopulateResult(null, "future");

    expect(result.kind === "error" && result.messages[0]).toMatch(/next event/i);
  });
});
