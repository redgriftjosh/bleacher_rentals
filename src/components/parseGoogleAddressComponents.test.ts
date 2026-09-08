import { describe, expect, it } from "vitest";
import {
  parseGoogleAddressComponents,
  type GoogleAddressComponent,
} from "./parseGoogleAddressComponents";

function component(long_name: string, ...types: string[]): GoogleAddressComponent {
  return { long_name, short_name: long_name, types };
}

describe("parseGoogleAddressComponents", () => {
  it("builds the street from street_number + route, not the raw suggestion text", () => {
    const result = parseGoogleAddressComponents(
      [
        component("2454", "street_number"),
        component("Nixon Road", "route"),
        component("Simcoe", "locality"),
        component("Ontario", "administrative_area_level_1"),
        component("N3Y 4K6", "postal_code"),
      ],
      "Timmermans' Ranch and horse stables, Nixon Road, Simcoe, ON, Canada",
    );

    expect(result).toEqual({
      address: "2454 Nixon Road",
      city: "Simcoe",
      state: "Ontario",
      postalCode: "N3Y 4K6",
    });
  });

  it("falls back to the raw suggestion text when there's no street_number/route", () => {
    // A named place (park, ranch, etc.) with no numbered street.
    const result = parseGoogleAddressComponents(
      [component("Ontario", "administrative_area_level_1")],
      "Algonquin Provincial Park, Ontario, Canada",
    );

    expect(result.address).toBe("Algonquin Provincial Park, Ontario, Canada");
  });

  it("falls back through sublocality / postal_town / admin_area_level_3 when locality is missing", () => {
    // The exact failure mode from the bug report: no `locality` component at
    // all, only the county (`administrative_area_level_2`) — city used to
    // come back as that county ("Norfolk") instead of the actual town.
    const result = parseGoogleAddressComponents(
      [
        component("Norfolk County", "administrative_area_level_2"),
        component("Simcoe", "postal_town"),
        component("Ontario", "administrative_area_level_1"),
      ],
      "Timmermans' Ranch and horse stables, Nixon Road, Simcoe, ON, Canada",
    );

    expect(result.city).toBe("Simcoe");
    expect(result.city).not.toBe("Norfolk County");
  });

  it("leaves city undefined rather than guessing when nothing usable is present", () => {
    const result = parseGoogleAddressComponents(
      [component("Norfolk County", "administrative_area_level_2")],
      "Somewhere, ON, Canada",
    );

    expect(result.city).toBeUndefined();
  });

  it("still returns state and postal code untouched", () => {
    const result = parseGoogleAddressComponents(
      [component("Ontario", "administrative_area_level_1"), component("N3Y 4K6", "postal_code")],
      "Somewhere, ON, Canada",
    );

    expect(result.state).toBe("Ontario");
    expect(result.postalCode).toBe("N3Y 4K6");
  });
});
