import { describe, it, expect } from "vitest";
import { canEditWorkTracker } from "./canEditWorkTracker";

describe("canEditWorkTracker", () => {
  // ═══ Admin ═══

  it("admin can edit any work tracker", () => {
    expect(
      canEditWorkTracker({
        isAdmin: true,
        isNew: false,
        currentUserId: "admin-1",
        createdByUserId: "other-user",
        driverUuid: "driver-X",
        ownDriverUuids: [],
      }),
    ).toBe(true);
  });

  it("admin can create new work tracker", () => {
    expect(
      canEditWorkTracker({
        isAdmin: true,
        isNew: true,
        currentUserId: "admin-1",
        createdByUserId: null,
        driverUuid: null,
        ownDriverUuids: [],
      }),
    ).toBe(true);
  });

  // ═══ AM: Creating ═══

  it("AM can create new work tracker", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: true,
        currentUserId: "am-user-1",
        createdByUserId: null,
        driverUuid: null,
        ownDriverUuids: ["driver-A"],
      }),
    ).toBe(true);
  });

  // ═══ AM: own WT (created_by = self) ═══

  it("AM can edit own work tracker (created_by = self)", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        createdByUserId: "am-user-1",
        driverUuid: "driver-X",
        ownDriverUuids: [],
      }),
    ).toBe(true);
  });

  // ═══ AM: WT with assigned driver ═══

  it("AM can edit WT with own driver (even if created by someone else)", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        createdByUserId: "admin-1", // created by admin
        driverUuid: "driver-A",
        ownDriverUuids: ["driver-A", "driver-B"],
      }),
    ).toBe(true);
  });

  // ═══ AM: someone else's WT, someone else's driver ═══

  it("AM cannot edit WT created by other with other's driver", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        createdByUserId: "am-user-2",
        driverUuid: "driver-X",
        ownDriverUuids: ["driver-A", "driver-B"],
      }),
    ).toBe(false);
  });

  // ═══ AM: someone else's WT, without driver ═══

  it("AM cannot edit WT created by other with no driver", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        createdByUserId: "am-user-2",
        driverUuid: null,
        ownDriverUuids: ["driver-A"],
      }),
    ).toBe(false);
  });

  // ═══ AM: own WT + assigned driver (both criteria) ═══

  it("AM can edit when both owner AND has own driver", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        createdByUserId: "am-user-1",
        driverUuid: "driver-A",
        ownDriverUuids: ["driver-A"],
      }),
    ).toBe(true);
  });

  // ═══ Edge cases ═══

  it("AM with null userId cannot edit", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: null,
        createdByUserId: null,
        driverUuid: null,
        ownDriverUuids: [],
      }),
    ).toBe(false);
  });

  it("AM with undefined createdByUserId cannot claim ownership", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        createdByUserId: undefined,
        driverUuid: null,
        ownDriverUuids: [],
      }),
    ).toBe(false);
  });

  it("driver UUID matches but is empty string → not a valid match", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        createdByUserId: "other",
        driverUuid: "",
        ownDriverUuids: [""],
      }),
    ).toBe(false);
  });

  // ═══ Viewer (canCreate = false) ═══

  it("viewer cannot create new work tracker (canCreate=false)", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: true,
        currentUserId: "viewer-1",
        createdByUserId: null,
        driverUuid: null,
        ownDriverUuids: [],
        canCreate: false,
      }),
    ).toBe(false);
  });

  it("viewer cannot edit existing work tracker", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: false,
        currentUserId: "viewer-1",
        createdByUserId: "am-user-1",
        driverUuid: "driver-A",
        ownDriverUuids: [],
        canCreate: false,
      }),
    ).toBe(false);
  });

  it("AM can create new work tracker (canCreate=true)", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isNew: true,
        currentUserId: "am-user-1",
        createdByUserId: null,
        driverUuid: null,
        ownDriverUuids: ["driver-A"],
        canCreate: true,
      }),
    ).toBe(true);
  });
});
