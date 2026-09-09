import { describe, expect, it } from "vitest";
import { getSelectableWorkTrackerTypes, isSingleFieldSetType } from "./workTrackerTypeDisplay";

const ALL_TYPES = [
  { id: "trip-1", display_name: "Trip", code: "trip" },
  { id: "repair-1", display_name: "Repair / Maintenance", code: "repair_maintenance" },
  {
    id: "other-1",
    display_name: "Site Visit / Cleaning / Other",
    code: "site_visit_cleaning_other",
  },
  { id: "site-visit-1", display_name: "Site Visit", code: null },
  { id: "setup-1", display_name: "Set up", code: null },
  { id: "hotel-1", display_name: "Hotel/ Per Diem", code: null },
  { id: "teardown-1", display_name: "Tear down", code: null },
  { id: "deadhead-1", display_name: "Deadhead", code: null },
];

describe("getSelectableWorkTrackerTypes", () => {
  it("returns only the rows with a canonical code, regardless of extra DB rows", () => {
    const result = getSelectableWorkTrackerTypes(ALL_TYPES);
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1", "other-1"]);
  });

  it("keeps each type's real display_name as-is (no relabeling)", () => {
    const result = getSelectableWorkTrackerTypes(ALL_TYPES);
    expect(result.map((t) => t.display_name)).toEqual([
      "Trip",
      "Repair / Maintenance",
      "Site Visit / Cleaning / Other",
    ]);
  });

  it("orders trip, repair_maintenance, site_visit_cleaning_other regardless of the DB's row/sort order", () => {
    // Shuffled and reversed relative to ALL_TYPES / the DB's sort_order.
    const shuffled = [
      { id: "deadhead-1", display_name: "Deadhead", code: null },
      {
        id: "other-1",
        display_name: "Site Visit / Cleaning / Other",
        code: "site_visit_cleaning_other",
      },
      { id: "repair-1", display_name: "Repair / Maintenance", code: "repair_maintenance" },
      { id: "trip-1", display_name: "Trip", code: "trip" },
    ];
    const result = getSelectableWorkTrackerTypes(shuffled);
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1", "other-1"]);
  });

  it("keeps a currently-selected type with no code in the list so it isn't dropped from an open work tracker", () => {
    const result = getSelectableWorkTrackerTypes(ALL_TYPES, "deadhead-1");
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1", "other-1", "deadhead-1"]);
    expect(result.find((t) => t.id === "deadhead-1")?.display_name).toBe("Deadhead");
  });

  it("does not duplicate a canonical type when it is the current selection", () => {
    const result = getSelectableWorkTrackerTypes(ALL_TYPES, "repair-1");
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1", "other-1"]);
  });

  it("skips a canonical code that is missing entirely from the DB rather than breaking", () => {
    const missingOther = ALL_TYPES.filter((t) => t.code !== "site_visit_cleaning_other");
    const result = getSelectableWorkTrackerTypes(missingOther);
    expect(result.map((t) => t.id)).toEqual(["trip-1", "repair-1"]);
  });

  it("handles an empty or unmatched type list", () => {
    expect(getSelectableWorkTrackerTypes([])).toEqual([]);
    expect(
      getSelectableWorkTrackerTypes([{ id: "x", display_name: "Random", code: null }]),
    ).toEqual([]);
  });
});

describe("isSingleFieldSetType", () => {
  it("is false for trip", () => {
    expect(isSingleFieldSetType("trip")).toBe(false);
  });

  it("is true for repair_maintenance and site_visit_cleaning_other", () => {
    expect(isSingleFieldSetType("repair_maintenance")).toBe(true);
    expect(isSingleFieldSetType("site_visit_cleaning_other")).toBe(true);
  });

  it("defaults to false (the full Trip-style layout) when there is no code at all", () => {
    expect(isSingleFieldSetType(null)).toBe(false);
    expect(isSingleFieldSetType(undefined)).toBe(false);
  });

  it("treats any non-null code other than trip as single-field-set", () => {
    expect(isSingleFieldSetType("some_future_code")).toBe(true);
  });
});
