import { describe, it, expect } from "vitest";
import {
  computeDriverZoneAssignmentChanges,
  mergeDriverZoneSelection,
  reconcileZoneDriverMap,
} from "./driverZoneAssignments";

describe("computeDriverZoneAssignmentChanges", () => {
  it("admin: adds and removes to match selection", () => {
    expect(
      computeDriverZoneAssignmentChanges({
        selectedZoneUuids: ["z1", "z3"],
        existingZoneUuids: ["z1", "z2"],
        manageableZoneUuids: null,
      }),
    ).toEqual({ toAdd: ["z3"], toRemove: ["z2"] });
  });

  it("AM: only changes zones in their scope", () => {
    expect(
      computeDriverZoneAssignmentChanges({
        selectedZoneUuids: ["z1", "z3"],
        existingZoneUuids: ["z1", "z2", "z4"],
        manageableZoneUuids: ["z1", "z2"],
      }),
    ).toEqual({ toAdd: [], toRemove: ["z2"] });
  });

  it("AM: can add a zone in scope", () => {
    expect(
      computeDriverZoneAssignmentChanges({
        selectedZoneUuids: ["z1", "z2"],
        existingZoneUuids: ["z1", "z4"],
        manageableZoneUuids: ["z1", "z2"],
      }),
    ).toEqual({ toAdd: ["z2"], toRemove: [] });
  });
});

describe("mergeDriverZoneSelection", () => {
  it("preserves zones outside AM scope", () => {
    expect(
      mergeDriverZoneSelection({
        currentAssignedZoneUuids: ["z1", "other"],
        manageableZoneUuids: ["z1", "z2"],
        selectedManageableZoneUuids: ["z2"],
      }),
    ).toEqual(["other", "z2"]);
  });
});

describe("reconcileZoneDriverMap", () => {
  it("adds the driver to newly assigned zones, creating a key if missing", () => {
    expect(
      reconcileZoneDriverMap({
        zoneDriverMap: { z1: ["other-driver"] },
        driverUuid: "self",
        addedZoneUuids: ["z1", "z2"],
        removedZoneUuids: [],
      }),
    ).toEqual({ z1: ["other-driver", "self"], z2: ["self"] });
  });

  it("removes the driver from zones it was unassigned from", () => {
    expect(
      reconcileZoneDriverMap({
        zoneDriverMap: { z1: ["self", "other-driver"] },
        driverUuid: "self",
        addedZoneUuids: [],
        removedZoneUuids: ["z1"],
      }),
    ).toEqual({ z1: ["other-driver"] });
  });

  it("does not duplicate the driver if it's already present in an added zone", () => {
    expect(
      reconcileZoneDriverMap({
        zoneDriverMap: { z1: ["self"] },
        driverUuid: "self",
        addedZoneUuids: ["z1"],
        removedZoneUuids: [],
      }),
    ).toEqual({ z1: ["self"] });
  });

  it("is a no-op for zones not mentioned in added or removed", () => {
    expect(
      reconcileZoneDriverMap({
        zoneDriverMap: { z1: ["a"], z2: ["b"] },
        driverUuid: "self",
        addedZoneUuids: [],
        removedZoneUuids: [],
      }),
    ).toEqual({ z1: ["a"], z2: ["b"] });
  });

  it("does not mutate the input map", () => {
    const input = { z1: ["other-driver"] };
    reconcileZoneDriverMap({
      zoneDriverMap: input,
      driverUuid: "self",
      addedZoneUuids: ["z1"],
      removedZoneUuids: [],
    });
    expect(input).toEqual({ z1: ["other-driver"] });
  });
});
