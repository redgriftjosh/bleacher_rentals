import { describe, expect, it } from "vitest";
import { hasErrors, validateCompanyForm, validateContactForm } from "../utils/formValidation";
import { validateEmail, validateName, validatePhone } from "@/lib/validation/fields";

describe("validatePhone", () => {
  it("accepts common US formats", () => {
    for (const value of [
      "5551234567",
      "(555) 123-4567",
      "555-123-4567",
      "555.123.4567",
      "1 555 123 4567",
    ]) {
      expect(validatePhone(value), value).toBeNull();
    }
  });

  it("accepts an international number written with a country code", () => {
    expect(validatePhone("+1 (555) 123-4567")).toBeNull();
    expect(validatePhone("+44 20 7946 0958")).toBeNull();
  });

  it("rejects a name typed into the phone field", () => {
    expect(validatePhone("John Smith")).toMatch(/can only contain digits/);
    expect(validatePhone("call me")).toMatch(/can only contain digits/);
  });

  it("rejects a number with the wrong digit count", () => {
    expect(validatePhone("12345")).toMatch(/10-digit/);
    expect(validatePhone("5551234567890")).toMatch(/10-digit/);
    expect(validatePhone("+123")).toMatch(/international/);
  });

  it("treats an empty value as valid unless required", () => {
    expect(validatePhone("")).toBeNull();
    expect(validatePhone("   ")).toBeNull();
    expect(validatePhone("", { required: true })).toMatch(/required/);
  });
});

describe("validateEmail", () => {
  it("accepts a well-formed address", () => {
    expect(validateEmail("jane@company.com")).toBeNull();
    expect(validateEmail("  jane.doe+tag@sub.company.co.uk  ")).toBeNull();
  });

  it("rejects free text and half-written addresses", () => {
    for (const value of [
      "Jane Doe",
      "jane@company",
      "jane.company.com",
      "jane@@company.com",
      "jane @company.com",
    ]) {
      expect(validateEmail(value), value).toMatch(/valid email/);
    }
  });

  it("treats an empty value as valid unless required", () => {
    expect(validateEmail("")).toBeNull();
    expect(validateEmail("", { required: true })).toMatch(/required/);
  });
});

describe("validateName", () => {
  it("requires content when the field is mandatory", () => {
    expect(validateName("", "First name", { required: true })).toMatch(/required/);
    expect(validateName("   ", "First name", { required: true })).toMatch(/required/);
  });

  it("rejects a one-character or punctuation-only name", () => {
    expect(validateName("J", "First name", { required: true })).toMatch(/at least 2/);
    expect(validateName("---", "First name", { required: true })).toMatch(/letters or numbers/);
  });

  it("accepts a normal name and skips an empty optional one", () => {
    expect(validateName("Jane", "First name", { required: true })).toBeNull();
    expect(validateName("", "Last name")).toBeNull();
  });
});

describe("validateContactForm", () => {
  const valid = {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@company.com",
    phone: "(555) 123-4567",
  };

  it("passes a fully valid contact", () => {
    expect(validateContactForm(valid)).toEqual({});
    expect(hasErrors(validateContactForm(valid))).toBe(false);
  });

  it("passes a contact with only a first name", () => {
    expect(validateContactForm({ firstName: "Jane", lastName: "", email: "", phone: "" })).toEqual(
      {},
    );
  });

  it("flags a name typed into the phone field", () => {
    const errors = validateContactForm({ ...valid, phone: "Jane Smith" });
    expect(errors.phone).toBeDefined();
    expect(errors.email).toBeUndefined();
    expect(hasErrors(errors)).toBe(true);
  });

  it("flags every bad field at once", () => {
    const errors = validateContactForm({
      firstName: "",
      lastName: "",
      email: "nope",
      phone: "nope",
    });
    expect(Object.keys(errors).sort()).toEqual(["email", "firstName", "phone"]);
  });
});

describe("validateCompanyForm", () => {
  it("passes a valid company", () => {
    expect(
      validateCompanyForm({
        companyName: "Live Nation",
        email: "info@ln.com",
        phone: "+1 310 867 7000",
      }),
    ).toEqual({});
  });

  it("requires a company name", () => {
    expect(validateCompanyForm({ companyName: "  ", email: "", phone: "" }).companyName).toMatch(
      /required/,
    );
  });

  it("flags a name typed into the phone field", () => {
    expect(
      validateCompanyForm({ companyName: "Live Nation", email: "", phone: "front desk" }).phone,
    ).toBeDefined();
  });
});
