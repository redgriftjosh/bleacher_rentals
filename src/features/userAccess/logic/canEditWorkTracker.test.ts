import { describe, it, expect } from "vitest";
import { canEditWorkTracker, canReleaseWorkTracker } from "./canEditWorkTracker";

describe("canEditWorkTracker", () => {
  it("admin can always edit", () => {
    expect(
      canEditWorkTracker({ isAdmin: true, isAccountManager: false, isNew: false }),
    ).toBe(true);
  });

  it("admin can create", () => {
    expect(
      canEditWorkTracker({ isAdmin: true, isAccountManager: false, isNew: true }),
    ).toBe(true);
  });

  it("AM can create (canCreate defaults true)", () => {
    expect(
      canEditWorkTracker({ isAdmin: false, isAccountManager: true, isNew: true }),
    ).toBe(true);
  });

  it("viewer cannot create (canCreate=false)", () => {
    expect(
      canEditWorkTracker({ isAdmin: false, isAccountManager: false, isNew: true, canCreate: false }),
    ).toBe(false);
  });

  it("non-AM non-admin cannot edit existing", () => {
    expect(
      canEditWorkTracker({ isAdmin: false, isAccountManager: false, isNew: false }),
    ).toBe(false);
  });

  describe("Lead AM", () => {
    const base = {
      isAdmin: false,
      isAccountManager: true,
      isNew: false,
      zoneUuid: "zone-a",
      leadZoneIds: ["zone-a"],
      accountManagerZoneIds: ["zone-a", "zone-b"],
    };

    it("can edit any WT in their lead zone", () => {
      expect(
        canEditWorkTracker({ ...base, createdByUserId: "other-user", userId: "me" }),
      ).toBe(true);
    });

    it("can edit own WT in lead zone", () => {
      expect(
        canEditWorkTracker({ ...base, createdByUserId: "me", userId: "me" }),
      ).toBe(true);
    });
  });

  describe("Junior AM", () => {
    const base = {
      isAdmin: false,
      isAccountManager: true,
      isNew: false,
      zoneUuid: "zone-b",
      leadZoneIds: ["zone-a"],
      accountManagerZoneIds: ["zone-a", "zone-b"],
    };

    it("can edit own WT", () => {
      expect(
        canEditWorkTracker({ ...base, createdByUserId: "me", userId: "me" }),
      ).toBe(true);
    });

    it("cannot edit WT created by someone else", () => {
      expect(
        canEditWorkTracker({ ...base, createdByUserId: "other-user", userId: "me" }),
      ).toBe(false);
    });

    it("cannot edit when userId is null", () => {
      expect(
        canEditWorkTracker({ ...base, createdByUserId: "me", userId: null }),
      ).toBe(false);
    });
  });
});

describe("canReleaseWorkTracker", () => {
  it("admin can always release", () => {
    expect(
      canReleaseWorkTracker({
        isAdmin: true,
        zoneUuid: "zone-a",
        leadZoneIds: [],
        accountManagerZoneIds: [],
      }),
    ).toBe(true);
  });

  it("lead AM can release in their lead zone", () => {
    expect(
      canReleaseWorkTracker({
        isAdmin: false,
        zoneUuid: "zone-a",
        leadZoneIds: ["zone-a"],
        accountManagerZoneIds: ["zone-a", "zone-b"],
      }),
    ).toBe(true);
  });

  it("junior AM cannot release", () => {
    expect(
      canReleaseWorkTracker({
        isAdmin: false,
        zoneUuid: "zone-b",
        leadZoneIds: ["zone-a"],
        accountManagerZoneIds: ["zone-a", "zone-b"],
      }),
    ).toBe(false);
  });

  it("non-AM cannot release", () => {
    expect(
      canReleaseWorkTracker({
        isAdmin: false,
        zoneUuid: "zone-a",
        leadZoneIds: [],
        accountManagerZoneIds: [],
      }),
    ).toBe(false);
  });
});
