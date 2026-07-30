import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { QuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import {
  TRIGGERS,
  QUOTE_SENT_CLIENT,
  QUOTE_SIGNED_CLIENT,
  PAYMENT_DUE_CLIENT,
  QUOTE_UNSIGNED_REMINDER,
  getTrigger,
} from "./triggers";
import { buildVariableValues } from "./variables";
import { validateTemplateVariables } from "./util/validateTemplateVariables";

const DIR = path.resolve(__dirname, "templates");

function doc(): QuoteDocumentData {
  return {
    contact: { name: "Jordan Ellis", email: "jordan@example.com", phone: "" },
    publicUrl: "https://x",
    quoteNumber: "Q-1",
    venue: { name: "V", street: "", city: "", state: "", zip: "" },
    dates: { eventStart: "2026-10-12", eventEnd: "" },
    totalCents: 1000,
    accountManager: "Sam",
    accountManagerEmail: "sam@x.com",
    company: { name: "BR" },
    currency: "USD",
  } as unknown as QuoteDocumentData;
}

/** Names (without braces) that the real send path can actually produce. */
function producedNames(): Set<string> {
  const values = buildVariableValues(doc(), {
    amountPaidCents: 1,
    amountDueCents: 1,
    dueDate: "2026-11-01",
  });
  return new Set(Object.keys(values));
}

describe("registry ↔ resolver stay in sync", () => {
  it("every variable declared on a trigger is produced by buildVariableValues", () => {
    const produced = producedNames();
    for (const trigger of TRIGGERS) {
      for (const token of trigger.variables) {
        const name = token.replace(/[{}]/g, "");
        expect(
          produced.has(name),
          `Trigger "${trigger.key}" declares ${token}, but buildVariableValues never produces "${name}"`,
        ).toBe(true);
      }
    }
  });

  it("trigger keys are unique", () => {
    const keys = TRIGGERS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("shipped template files only use valid variables", () => {
  // Each bundled template maps to the trigger whose variable set it targets.
  const cases: Array<{ file: string; triggerKey: string }> = [
    { file: "contract-signed.html", triggerKey: QUOTE_SIGNED_CLIENT },
    { file: "quote-sent.html", triggerKey: QUOTE_SENT_CLIENT },
    { file: "payment-due.html", triggerKey: PAYMENT_DUE_CLIENT },
    { file: "unsigned-quote-reminder.html", triggerKey: QUOTE_UNSIGNED_REMINDER },
  ];

  for (const { file, triggerKey } of cases) {
    it(`${file} has no invalid tokens`, () => {
      const html = readFileSync(path.join(DIR, file), "utf8");
      const vars = getTrigger(triggerKey)!.variables;
      const errors = validateTemplateVariables("", html, vars);
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
});
