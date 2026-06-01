import { describe, it, expect } from "vitest";
import { searchEvents } from "./searchEvents";
import { QuotesBookingsEvent } from "../types";

const makeEvent = (overrides: Partial<QuotesBookingsEvent> = {}): QuotesBookingsEvent => ({
  id: "1",
  event_name: null,
  event_start: null,
  event_end: null,
  event_status: null,
  contract_revenue_cents: null,
  created_at: null,
  created_by_user_uuid: null,
  account_manager_first_name: null,
  account_manager_last_name: null,
  account_manager_email: null,
  address_street: null,
  address_city: null,
  address_state: null,
  contact_first_name: null,
  contact_last_name: null,
  contact_email: null,
  company_name: null,
  ...overrides,
});

const sampleEvents: QuotesBookingsEvent[] = [
  makeEvent({
    id: "1",
    event_name: "Stadium Concert 2025",
    event_start: "2025-09-18",
    event_end: "2025-09-20",
    contract_revenue_cents: 720000,
    account_manager_first_name: "Sandy",
    account_manager_last_name: "Johnson",
    account_manager_email: "sandy@bleacherrentals.com",
    address_street: "100 Grand Ave",
    address_city: "Chicago",
    address_state: "Illinois",
    contact_first_name: "James",
    contact_last_name: "Sanders",
    contact_email: "james@museum.com",
    company_name: "Children's Museum",
  }),
  makeEvent({
    id: "2",
    event_name: "County Fair",
    event_start: "2025-06-15",
    event_end: "2025-06-18",
    contract_revenue_cents: 350000,
    account_manager_first_name: "Mike",
    account_manager_last_name: "Davis",
    account_manager_email: "mike@bleacherrentals.com",
    address_street: "500 Fairground Rd",
    address_city: "Dallas",
    address_state: "Texas",
    contact_first_name: "Sarah",
    contact_last_name: "Lee",
    contact_email: "sarah@countyfair.org",
    company_name: "Dallas Events Inc",
  }),
  makeEvent({
    id: "3",
    event_name: "School Graduation",
    event_start: "2025-05-25",
    event_end: "2025-05-25",
    contract_revenue_cents: 150000,
    account_manager_first_name: "Sandy",
    account_manager_last_name: "Johnson",
    account_manager_email: "sandy@bleacherrentals.com",
    address_city: "Toronto",
    address_state: "Ontario",
    contact_first_name: "Bob",
    contact_last_name: null,
    contact_email: "bob@school.ca",
    company_name: null,
  }),
];

describe("searchEvents", () => {
  // ── Empty / whitespace queries ──

  it("returns all events when query is empty", () => {
    expect(searchEvents(sampleEvents, "")).toEqual(sampleEvents);
  });

  it("returns all events when query is whitespace", () => {
    expect(searchEvents(sampleEvents, "   ")).toEqual(sampleEvents);
  });

  // ── Event name ──

  it("finds by event name", () => {
    const result = searchEvents(sampleEvents, "Stadium Concert");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by partial event name (case-insensitive)", () => {
    const result = searchEvents(sampleEvents, "county");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  // ── Account Manager ──

  it("finds by account manager first name", () => {
    const result = searchEvents(sampleEvents, "Sandy");
    expect(result).toHaveLength(2);
  });

  it("finds by account manager full name", () => {
    const result = searchEvents(sampleEvents, "Sandy Johnson");
    expect(result).toHaveLength(2);
  });

  it("finds by account manager email", () => {
    const result = searchEvents(sampleEvents, "mike@bleacherrentals.com");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("finds by partial account manager email", () => {
    const result = searchEvents(sampleEvents, "sandy@bleacher");
    expect(result).toHaveLength(2);
  });

  // ── Dates ──

  it("finds by ISO date", () => {
    const result = searchEvents(sampleEvents, "2025-09-18");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by partial ISO date (year-month)", () => {
    const result = searchEvents(sampleEvents, "2025-06");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("finds by formatted date", () => {
    const result = searchEvents(sampleEvents, "Sep 18, 2025");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by partial formatted date (month + day)", () => {
    const result = searchEvents(sampleEvents, "Jun 15");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("finds by month name only", () => {
    const result = searchEvents(sampleEvents, "May");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  // ── Amount ──

  it("finds by formatted amount", () => {
    const result = searchEvents(sampleEvents, "$7,200.00");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by partial amount", () => {
    const result = searchEvents(sampleEvents, "3,500");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  // ── Address ──

  it("finds by street address", () => {
    const result = searchEvents(sampleEvents, "Grand Ave");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by city", () => {
    const result = searchEvents(sampleEvents, "Chicago");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by state", () => {
    const result = searchEvents(sampleEvents, "Texas");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("finds by Canadian province", () => {
    const result = searchEvents(sampleEvents, "Ontario");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  // ── Contact ──

  it("finds by contact first name", () => {
    const result = searchEvents(sampleEvents, "James");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by contact full name", () => {
    const result = searchEvents(sampleEvents, "James Sanders");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by contact email", () => {
    const result = searchEvents(sampleEvents, "james@museum.com");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by partial contact email domain", () => {
    const result = searchEvents(sampleEvents, "@countyfair.org");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("finds contact with null last name", () => {
    const result = searchEvents(sampleEvents, "bob@school.ca");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  // ── Company ──

  it("finds by company name", () => {
    const result = searchEvents(sampleEvents, "Children's Museum");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("finds by partial company name", () => {
    const result = searchEvents(sampleEvents, "Dallas Events");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  // ── Edge cases ──

  it("returns empty array when nothing matches", () => {
    const result = searchEvents(sampleEvents, "zzzznonexistent");
    expect(result).toHaveLength(0);
  });

  it("handles empty events array", () => {
    const result = searchEvents([], "anything");
    expect(result).toHaveLength(0);
  });

  it("handles events with all null fields", () => {
    const events = [makeEvent()];
    const result = searchEvents(events, "something");
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    expect(searchEvents(sampleEvents, "STADIUM")).toHaveLength(1);
    expect(searchEvents(sampleEvents, "stadium")).toHaveLength(1);
    expect(searchEvents(sampleEvents, "StAdIuM")).toHaveLength(1);
  });
});
