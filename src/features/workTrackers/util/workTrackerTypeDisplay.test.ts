import { describe, expect, it } from "vitest";
import { getSelectableWorkTrackerTypes } from "./workTrackerTypeDisplay";

const ALL_TYPES = [
  { id: "trip-1", display_name: "Trip" },
  { id: "repair-1", display_name: "Repair/Maintenance" },
  { id: "cleaning-1", display_name: "Cleaning" },
  { id: "site-visit-1", display_name: "Site Visit" },
  { id: "setup-1", display_name: "Set up" },
  { id: "hotel-1", display_name: "Hotel/ Per Diem" },
  { id: "teardown-1", display_name: "Tear down" },
  { id: "deadhead-1", display_name: "Deadhead" },
];

describe("getSelectableWorkTrackerTypes", () => {
  it("returns only the 3 canonical types, regardless of extra DB rows", () => {
    const result = getSelectableWorkTrackerTypes(ALL_TYPES);
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1", "cleaning-1"]);
  });

  it("relabels the 3 canonical types to their final display names", () => {
    const result = getSelectableWorkTrackerTypes(ALL_TYPES);
    expect(result.map((t) => t.display_name)).toEqual([
      "Trip",
      "Repair / Maintenance",
      "Site Visit / Cleaning / Other",
    ]);
  });

  it("orders Trip, Repair/Maintenance, Cleaning regardless of the DB's row/sort order", () => {
    // Shuffled and reversed relative to ALL_TYPES / the DB's sort_order.
    const shuffled = [
      { id: "deadhead-1", display_name: "Deadhead" },
      { id: "cleaning-1", display_name: "Cleaning" },
      { id: "repair-1", display_name: "Repair/Maintenance" },
      { id: "trip-1", display_name: "Trip" },
    ];
    const result = getSelectableWorkTrackerTypes(shuffled);
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1", "cleaning-1"]);
  });

  it("keeps a currently-selected legacy type in the list, unrelabeled, so it isn't dropped from an open work tracker", () => {
    const result = getSelectableWorkTrackerTypes(ALL_TYPES, "deadhead-1");
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1", "cleaning-1", "deadhead-1"]);
    expect(result.find((t) => t.id === "deadhead-1")?.display_name).toBe("Deadhead");
  });

  it("does not duplicate a canonical type when it is the current selection", () => {
    const result = getSelectableWorkTrackerTypes(ALL_TYPES, "repair-1");
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1", "cleaning-1"]);
  });

  it("skips a canonical type that is missing entirely from the DB rather than breaking", () => {
    const missingCleaning = ALL_TYPES.filter((t) => t.display_name !== "Cleaning");
    const result = getSelectableWorkTrackerTypes(missingCleaning);
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1"]);
  });

  it("handles an empty or unmatched type list", () => {
    expect(getSelectableWorkTrackerTypes([])).toEqual([]);
    expect(getSelectableWorkTrackerTypes([{ id: "x", display_name: "Random" }])).toEqual([]);
  });
});
