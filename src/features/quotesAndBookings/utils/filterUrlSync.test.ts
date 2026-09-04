import { describe, it, expect } from "vitest";
import {
  filtersToSearchParams,
  searchParamsToFilters,
  hasUrlSyncedFilterParams,
  type UrlSyncedListState,
} from "./filterUrlSync";

const emptyState: UrlSyncedListState = {
  filters: {
    statuses: [],
    createdFrom: null,
    createdTo: null,
    eventFrom: null,
    eventTo: null,
    bookedFrom: null,
    bookedTo: null,
    accountManagerUserUuid: null,
    inGoodShuffle: null,
    inQuickBooks: null,
    salesOfficeUuid: null,
  },
  searchQuery: "",
  showDeleted: false,
};

describe("filtersToSearchParams / searchParamsToFilters round-trip", () => {
  it("round-trips a fully populated filter state", () => {
    const state: UrlSyncedListState = {
      filters: {
        statuses: ["quoted", "booked"],
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
        eventFrom: "2026-02-01",
        eventTo: "2026-02-28",
        bookedFrom: "2026-01-15",
        bookedTo: "2026-01-20",
        accountManagerUserUuid: "am-uuid-1",
        inGoodShuffle: true,
        inQuickBooks: false,
        salesOfficeUuid: "office-uuid-1",
      },
      searchQuery: "acme corp",
      showDeleted: true,
    };

    const params = filtersToSearchParams(state);
    const parsed = searchParamsToFilters(params);
    expect(parsed).toEqual(state);
  });

  it("round-trips the empty state to no params at all", () => {
    const params = filtersToSearchParams(emptyState);
    expect(params.toString()).toBe("");
    expect(searchParamsToFilters(params)).toEqual(emptyState);
  });

  it("omits false booleans (inQuickBooks) but keeps them distinguishable from null", () => {
    const params = filtersToSearchParams({
      ...emptyState,
      filters: { ...emptyState.filters, inQuickBooks: false },
    });
    expect(params.get("quickBooks")).toBe("0");
    expect(searchParamsToFilters(params).filters.inQuickBooks).toBe(false);
  });

  it("preserves unrelated existing params (e.g. scorecard deep-link params)", () => {
    const existing = new URLSearchParams({ template: "weeklyBookings", timeRange: "weekly" });
    const params = filtersToSearchParams({ ...emptyState, searchQuery: "hello" }, existing);
    expect(params.get("template")).toBe("weeklyBookings");
    expect(params.get("timeRange")).toBe("weekly");
    expect(params.get("q")).toBe("hello");
  });

  it("removes a param when its value clears back to empty/null", () => {
    const existing = new URLSearchParams({ q: "old search", showDeleted: "1" });
    const params = filtersToSearchParams(emptyState, existing);
    expect(params.get("q")).toBeNull();
    expect(params.get("showDeleted")).toBeNull();
  });
});

describe("hasUrlSyncedFilterParams", () => {
  it("is false when none of the owned params are present", () => {
    expect(hasUrlSyncedFilterParams(new URLSearchParams({ template: "weeklyBookings" }))).toBe(
      false,
    );
  });

  it("is true when at least one owned param is present", () => {
    expect(hasUrlSyncedFilterParams(new URLSearchParams({ q: "acme" }))).toBe(true);
    expect(hasUrlSyncedFilterParams(new URLSearchParams({ showDeleted: "1" }))).toBe(true);
  });
});
