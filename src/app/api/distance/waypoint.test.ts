import { describe, expect, it } from "vitest";
import { buildRoutesWaypoint } from "./waypoint";

describe("buildRoutesWaypoint", () => {
  it("builds a location waypoint from a lat,lng string", () => {
    expect(buildRoutesWaypoint("42.86068059999999,-80.4036076")).toEqual({
      location: { latLng: { latitude: 42.86068059999999, longitude: -80.4036076 } },
    });
  });

  it("handles positive longitude too", () => {
    expect(buildRoutesWaypoint("30.53944,87.693593")).toEqual({
      location: { latLng: { latitude: 30.53944, longitude: 87.693593 } },
    });
  });

  it("falls back to an address waypoint for anything that isn't a bare lat,lng pair", () => {
    expect(buildRoutesWaypoint("2454 Nixon Rd, Simcoe, ON")).toEqual({
      address: "2454 Nixon Rd, Simcoe, ON",
    });
  });

  it("does not mistake an address containing a comma-separated number for coordinates", () => {
    expect(buildRoutesWaypoint("123 Main St, Suite 5, Springfield")).toEqual({
      address: "123 Main St, Suite 5, Springfield",
    });
  });

  it("treats an empty string as an address, not a match", () => {
    expect(buildRoutesWaypoint("")).toEqual({ address: "" });
  });
});
