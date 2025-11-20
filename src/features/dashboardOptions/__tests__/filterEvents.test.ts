import { describe, it, expect } from "vitest";
import { filterEvents } from "../util";

// ------------------------------------------------------------
// Tests for hideLostEvents filtering
// ------------------------------------------------------------

describe("filterEvents with hideLostEvents", () => {
  const mockEvents: any[] = [
    {
      eventId: 1,
      selectedStatus: "BOOKED",
      addressData: { state: "California" },
    },
    {
      eventId: 2,
      selectedStatus: "QUOTED",
      addressData: { state: "California" },
    },
    {
      eventId: 3,
      selectedStatus: "LOST",
      addressData: { state: "California" },
    },
    {
      eventId: 4,
      selectedStatus: "BOOKED",
      addressData: { state: "New York" },
    },
    {
      eventId: 5,
      selectedStatus: "LOST",
      addressData: { state: "New York" },
    },
  ];

  // California is index 4, New York is index 31 in STATES array
  const stateProvinces = [4, 31];

  it("filters out LOST events when hideLostEvents is true", () => {
    const result = filterEvents(mockEvents, stateProvinces, true);
    const ids = result.map((e: any) => e.eventId);
    // Should only include events 1, 2, 4 (BOOKED/QUOTED, not LOST)
    expect(ids).toEqual([1, 2, 4]);
  });

  it("includes LOST events when hideLostEvents is false", () => {
    const result = filterEvents(mockEvents, stateProvinces, false);
    const ids = result.map((e: any) => e.eventId);
    // Should include all events in CA and NY (1, 2, 3, 4, 5)
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it("defaults to hiding LOST events when parameter is not provided", () => {
    const result = filterEvents(mockEvents, stateProvinces);
    const ids = result.map((e: any) => e.eventId);
    // Should default to hideLostEvents=true, so only 1, 2, 4
    expect(ids).toEqual([1, 2, 4]);
  });

  it("filters by state province first, then applies hideLostEvents", () => {
    // Only allow CA (index 4)
    const caOnly = [4];
    const result = filterEvents(mockEvents, caOnly, true);
    const ids = result.map((e: any) => e.eventId);
    // Should only include CA events that are not LOST: 1, 2
    expect(ids).toEqual([1, 2]);
  });

  it("returns empty array when all events are LOST and hideLostEvents is true", () => {
    const allLost: any[] = [
      { eventId: 1, selectedStatus: "LOST", addressData: { state: "California" } },
      { eventId: 2, selectedStatus: "LOST", addressData: { state: "New York" } },
    ];
    const result = filterEvents(allLost, stateProvinces, true);
    expect(result).toEqual([]);
  });
});
