import { describe, it, expect } from "vitest";
import {
  findContactDuplicates,
  findCompanyDuplicates,
  findCompanyContactDuplicates,
} from "../utils/findDuplicates";

describe("findContactDuplicates", () => {
  const contacts = [
    { id: "1", firstName: "Jane", lastName: "Doe", email: "Jane@Co.com", phone: "+1 (555) 123-4567" },
    { id: "2", firstName: "John", lastName: "Smith", email: "john@co.com", phone: "5559999999" },
  ];

  it("returns [] when both email and phone are empty", () => {
    expect(findContactDuplicates(contacts, { email: "", phone: "" })).toEqual([]);
  });

  it("matches email case-insensitively", () => {
    const r = findContactDuplicates(contacts, { email: "jane@co.com", phone: "" });
    expect(r.map((c) => c.id)).toEqual(["1"]);
  });

  it("matches phone ignoring formatting", () => {
    const r = findContactDuplicates(contacts, { email: "", phone: "555-123-4567" });
    expect(r.map((c) => c.id)).toEqual(["1"]);
  });

  it("excludes the record being edited", () => {
    const r = findContactDuplicates(contacts, { email: "jane@co.com", phone: "" }, "1");
    expect(r).toEqual([]);
  });

  it("does not match on empty stored fields", () => {
    const withBlank = [{ id: "3", firstName: "No", email: null, phone: null }];
    expect(findContactDuplicates(withBlank, { email: "", phone: "" })).toEqual([]);
  });
});

describe("findCompanyDuplicates", () => {
  const companies = [
    { id: "1", companyName: "Live Nation", email: "info@ln.com", phone: "3108677000" },
    { id: "2", companyName: "AEG", email: null, phone: null },
  ];

  it("matches company name case/whitespace-insensitively", () => {
    const r = findCompanyDuplicates(companies, { companyName: "  live   nation " });
    expect(r.map((c) => c.id)).toEqual(["1"]);
  });

  it("matches by email or phone", () => {
    expect(findCompanyDuplicates(companies, { companyName: "", email: "INFO@ln.com" }).map((c) => c.id)).toEqual(["1"]);
    expect(findCompanyDuplicates(companies, { companyName: "", phone: "(310) 867-7000" }).map((c) => c.id)).toEqual(["1"]);
  });

  it("returns [] when all fields empty", () => {
    expect(findCompanyDuplicates(companies, { companyName: "", email: "", phone: "" })).toEqual([]);
  });
});

describe("findCompanyContactDuplicates (email/phone only — blocking)", () => {
  const companies = [
    { id: "1", companyName: "Live Nation", email: "info@ln.com", phone: "3108677000" },
    { id: "2", companyName: "AEG", email: null, phone: null },
  ];

  it("ignores name matches", () => {
    expect(findCompanyContactDuplicates(companies, { email: "", phone: "" })).toEqual([]);
  });

  it("matches by email or phone", () => {
    expect(
      findCompanyContactDuplicates(companies, { email: "info@LN.com", phone: "" }).map((c) => c.id),
    ).toEqual(["1"]);
    expect(
      findCompanyContactDuplicates(companies, { email: "", phone: "(310) 867-7000" }).map(
        (c) => c.id,
      ),
    ).toEqual(["1"]);
  });
});
