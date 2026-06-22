import { describe, it, expect } from "vitest";
import { filterCompanies, filterContacts } from "../utils/searchFilter";

const companies = [
  { id: "1", companyName: "Live Nation", email: "info@livenation.com", phone: "+1-310-867-7000" },
  { id: "2", companyName: "AEG Presents", email: "hello@aeg.com", phone: "+1-213-742-7100" },
  { id: "3", companyName: "Acme Corp", email: null, phone: null },
];

const contacts = [
  { id: "1", firstName: "Jane", lastName: "Smith", email: "jane@livenation.com", phone: "+1-555-0001", companyName: "Live Nation" },
  { id: "2", firstName: "Bob", lastName: "Jones", email: "bob@aeg.com", phone: "+1-555-0002", companyName: "AEG Presents" },
  { id: "3", firstName: "Alice", lastName: null, email: null, phone: null, companyName: null },
];

describe("filterCompanies", () => {
  it("returns all when query is empty", () => {
    expect(filterCompanies(companies, "")).toHaveLength(3);
    expect(filterCompanies(companies, "   ")).toHaveLength(3);
  });

  it("filters by company name (case-insensitive)", () => {
    expect(filterCompanies(companies, "live")).toEqual([companies[0]]);
    expect(filterCompanies(companies, "NATION")).toEqual([companies[0]]);
  });

  it("filters by email", () => {
    expect(filterCompanies(companies, "aeg.com")).toEqual([companies[1]]);
  });

  it("filters by phone", () => {
    expect(filterCompanies(companies, "213")).toEqual([companies[1]]);
  });

  it("returns empty when no match", () => {
    expect(filterCompanies(companies, "xyz-no-match")).toHaveLength(0);
  });

  it("skips null email/phone without throwing", () => {
    expect(() => filterCompanies(companies, "acme")).not.toThrow();
    expect(filterCompanies(companies, "acme")).toEqual([companies[2]]);
  });
});

describe("filterContacts", () => {
  it("returns all when query is empty", () => {
    expect(filterContacts(contacts, "")).toHaveLength(3);
  });

  it("filters by first name", () => {
    expect(filterContacts(contacts, "jane")).toEqual([contacts[0]]);
  });

  it("filters by last name", () => {
    expect(filterContacts(contacts, "jones")).toEqual([contacts[1]]);
  });

  it("filters by full name", () => {
    expect(filterContacts(contacts, "jane smith")).toEqual([contacts[0]]);
  });

  it("filters by email", () => {
    expect(filterContacts(contacts, "bob@aeg")).toEqual([contacts[1]]);
  });

  it("filters by phone", () => {
    expect(filterContacts(contacts, "0001")).toEqual([contacts[0]]);
  });

  it("filters by company name", () => {
    expect(filterContacts(contacts, "aeg")).toEqual([contacts[1]]);
    expect(filterContacts(contacts, "live nation")).toEqual([contacts[0]]);
  });

  it("handles null fields without throwing", () => {
    expect(() => filterContacts(contacts, "alice")).not.toThrow();
    expect(filterContacts(contacts, "alice")).toEqual([contacts[2]]);
  });

  it("returns empty when no match", () => {
    expect(filterContacts(contacts, "xyz-no-match")).toHaveLength(0);
  });
});
