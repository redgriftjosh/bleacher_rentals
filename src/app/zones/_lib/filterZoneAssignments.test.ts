import { describe, it, expect } from "vitest";
import { isBleacherAvailableForZone } from "./filterZoneAssignments";
import { ZoneBleacherOption } from "./hooks/useZoneBleachers";

function makeBleacher(overrides: Partial<ZoneBleacherOption> = {}): ZoneBleacherOption {
  return {
    bleacherUuid: "b-1",
    bleacherNumber: 100,
    bleacherRows: 10,
    bleacherSeats: 100,
    summerHomeBaseName: "HB1",
    winterHomeBaseName: "HB2",
    zoneUuid: null,
    zoneName: null,
    ...overrides,
  };
}

describe("isBleacherAvailableForZone", () => {
  it("available when bleacher has no zone", () => {
    const b = makeBleacher({ zoneUuid: null });
    expect(isBleacherAvailableForZone(b, "zone-1", [])).toBe(true);
  });

  it("available when bleacher belongs to current zone (edit mode)", () => {
    const b = makeBleacher({ zoneUuid: "zone-1" });
    expect(isBleacherAvailableForZone(b, "zone-1", [])).toBe(true);
  });

  it("unavailable when bleacher belongs to a different zone", () => {
    const b = makeBleacher({ zoneUuid: "zone-2" });
    expect(isBleacherAvailableForZone(b, "zone-1", [])).toBe(false);
  });

  it("available when bleacher is already selected (despite other zone)", () => {
    const b = makeBleacher({ bleacherUuid: "b-1", zoneUuid: "zone-2" });
    expect(isBleacherAvailableForZone(b, "zone-1", ["b-1"])).toBe(true);
  });

  it("unavailable when no current zone and bleacher has a zone", () => {
    const b = makeBleacher({ zoneUuid: "zone-1" });
    expect(isBleacherAvailableForZone(b, null, [])).toBe(false);
  });

  it("available when no current zone and bleacher has no zone", () => {
    const b = makeBleacher({ zoneUuid: null });
    expect(isBleacherAvailableForZone(b, null, [])).toBe(true);
  });

  it("unavailable when currentZoneUuid is undefined and bleacher has zone", () => {
    const b = makeBleacher({ zoneUuid: "zone-1" });
    expect(isBleacherAvailableForZone(b, undefined, [])).toBe(false);
  });
});
