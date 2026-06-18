import { describe, it, expect } from "vitest";
import { getAmRoleForZone } from "./getAmRoleForZone";

describe("getAmRoleForZone", () => {
  const leadZoneIds = ["zone-a", "zone-b"];
  const accountManagerZoneIds = ["zone-a", "zone-b", "zone-c", "zone-d"];

  it("returns 'lead' when zone is in leadZoneIds", () => {
    expect(
      getAmRoleForZone({ zoneUuid: "zone-a", leadZoneIds, accountManagerZoneIds }),
    ).toBe("lead");
  });

  it("returns 'junior' when zone is in accountManagerZoneIds but not leadZoneIds", () => {
    expect(
      getAmRoleForZone({ zoneUuid: "zone-c", leadZoneIds, accountManagerZoneIds }),
    ).toBe("junior");
  });

  it("returns 'none' when zone is not in any list", () => {
    expect(
      getAmRoleForZone({ zoneUuid: "zone-x", leadZoneIds, accountManagerZoneIds }),
    ).toBe("none");
  });

  it("returns 'none' when zoneUuid is null", () => {
    expect(
      getAmRoleForZone({ zoneUuid: null, leadZoneIds, accountManagerZoneIds }),
    ).toBe("none");
  });

  it("returns 'none' when zoneUuid is undefined", () => {
    expect(
      getAmRoleForZone({ zoneUuid: undefined, leadZoneIds, accountManagerZoneIds }),
    ).toBe("none");
  });

  it("returns 'none' when both lists are empty", () => {
    expect(
      getAmRoleForZone({ zoneUuid: "zone-a", leadZoneIds: [], accountManagerZoneIds: [] }),
    ).toBe("none");
  });
});
