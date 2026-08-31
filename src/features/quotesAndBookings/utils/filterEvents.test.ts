import { describe, it, expect } from "vitest";
import { filterQuotesBookingsEvents } from "./filterEvents";
import type { QuotesBookingsEvent, QuotesBookingsFilters } from "../types";

const noFilters: QuotesBookingsFilters = {
  isOpen: false,
  statuses: [],
  createdFrom: null,
  createdTo: null,
  eventFrom: null,
  eventTo: null,
  bookedFrom: null,
  bookedTo: null,
  accountManagerUserUuid: null,
  inGoodShuffle: null,
};

const event = (id: string, goodshuffle_url: string | null): QuotesBookingsEvent =>
  ({ id, goodshuffle_url }) as QuotesBookingsEvent;

const linked = event("linked", "https://goodshuffle.com/e/123");
const absent = event("absent", null);
const blank = event("blank", "");
const whitespace = event("whitespace", "   ");

const ids = (filters: Partial<QuotesBookingsFilters>) =>
  filterQuotesBookingsEvents([linked, absent, blank, whitespace], {
    ...noFilters,
    ...filters,
  }).map((e) => e.id);

describe("In GoodShuffle filter", () => {
  it("shows everything when the filter is off", () => {
    expect(ids({ inGoodShuffle: null })).toEqual(["linked", "absent", "blank", "whitespace"]);
  });

  it("shows only events carrying a URL", () => {
    expect(ids({ inGoodShuffle: true })).toEqual(["linked"]);
  });

  it("shows only events without one", () => {
    expect(ids({ inGoodShuffle: false })).toEqual(["absent", "blank", "whitespace"]);
  });

  it("treats a blank or whitespace-only URL as not in GoodShuffle", () => {
    // A field someone opened and left empty. Counting it as linked would tell
    // the user an event is synced when it is not — and there are such rows.
    expect(ids({ inGoodShuffle: true })).not.toContain("blank");
    expect(ids({ inGoodShuffle: true })).not.toContain("whitespace");
  });

  it("combines with the other filters rather than replacing them", () => {
    const quoted = { ...event("quoted", "https://x"), event_status: "quoted" };
    const booked = { ...event("booked", "https://x"), event_status: "booked" };
    const result = filterQuotesBookingsEvents([quoted, booked, absent], {
      ...noFilters,
      statuses: ["quoted"],
      inGoodShuffle: true,
    });
    expect(result.map((e) => e.id)).toEqual(["quoted"]);
  });
});
