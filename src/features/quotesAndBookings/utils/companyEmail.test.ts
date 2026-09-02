import { describe, expect, it } from "vitest";
import { isCompanyEmail } from "./companyEmail";

describe("isCompanyEmail", () => {
  it("accepts addresses on the company domain", () => {
    expect(isCompanyEmail("josh@bleacherrentals.com")).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(isCompanyEmail("  Josh@BleacherRentals.com  ")).toBe(true);
  });

  it("rejects personal addresses", () => {
    expect(isCompanyEmail("josh@gmail.com")).toBe(false);
    expect(isCompanyEmail("josh@bleacherrentals.ca")).toBe(false);
  });

  it("rejects lookalike domains that merely contain the company name", () => {
    expect(isCompanyEmail("josh@bleacherrentals.com.attacker.net")).toBe(false);
    expect(isCompanyEmail("bleacherrentals.com@gmail.com")).toBe(false);
  });

  it("treats a missing address as not company", () => {
    expect(isCompanyEmail(null)).toBe(false);
    expect(isCompanyEmail(undefined)).toBe(false);
    expect(isCompanyEmail("")).toBe(false);
    expect(isCompanyEmail("   ")).toBe(false);
  });
});
