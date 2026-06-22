import { describe, it, expect } from "vitest";
import { isBleacherOwnedByAM } from "./isBleacherOwnedByAM";

describe("isBleacherOwnedByAM", () => {
  const zoneA = "zone-a";
  const zoneB = "zone-b";

  it("true when bleacher zone is in AM zones", () => {
    expect(
      isBleacherOwnedByAM({
        bleacherZoneUuid: zoneA,
        accountManagerZoneIds: [zoneA, zoneB],
      }),
    ).toBe(true);
  });

  it("false when bleacher zone is not in AM zones", () => {
    expect(
      isBleacherOwnedByAM({
        bleacherZoneUuid: "zone-c",
        accountManagerZoneIds: [zoneA, zoneB],
      }),
    ).toBe(false);
  });

  it("false when bleacher has no zone", () => {
    expect(
      isBleacherOwnedByAM({
        bleacherZoneUuid: null,
        accountManagerZoneIds: [zoneA],
      }),
    ).toBe(false);
  });

  it("false when AM has no zones", () => {
    expect(
      isBleacherOwnedByAM({
        bleacherZoneUuid: zoneA,
        accountManagerZoneIds: [],
      }),
    ).toBe(false);
  });

  it("false when bleacher zone is undefined", () => {
    expect(
      isBleacherOwnedByAM({
        bleacherZoneUuid: undefined,
        accountManagerZoneIds: [zoneA],
      }),
    ).toBe(false);
  });
});
