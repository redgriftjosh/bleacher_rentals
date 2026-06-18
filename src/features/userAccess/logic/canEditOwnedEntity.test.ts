import { describe, it, expect } from "vitest";
import { canEditOwnedEntity, canSendQuote } from "./canEditOwnedEntity";

describe("canEditOwnedEntity (Events / MaintenanceEvents)", () => {
  it("admin can always edit", () => {
    expect(canEditOwnedEntity({ isAdmin: true, isNew: false })).toBe(true);
  });

  it("admin can create", () => {
    expect(canEditOwnedEntity({ isAdmin: true, isNew: true })).toBe(true);
  });

  it("AM can create (canCreate defaults true)", () => {
    expect(canEditOwnedEntity({ isAdmin: false, isNew: true })).toBe(true);
  });

  it("viewer cannot create (canCreate=false)", () => {
    expect(canEditOwnedEntity({ isAdmin: false, isNew: true, canCreate: false })).toBe(false);
  });

  it("viewer cannot edit existing (canCreate=false)", () => {
    expect(canEditOwnedEntity({ isAdmin: false, isNew: false, canCreate: false })).toBe(false);
  });

  describe("Lead AM", () => {
    const base = {
      isAdmin: false,
      isNew: false,
      zoneUuid: "zone-a",
      leadZoneIds: ["zone-a"],
      accountManagerZoneIds: ["zone-a", "zone-b"],
    };

    it("can edit any entity in their lead zone", () => {
      expect(
        canEditOwnedEntity({ ...base, createdByUserId: "other-user", userId: "me" }),
      ).toBe(true);
    });
  });

  describe("Junior AM", () => {
    const base = {
      isAdmin: false,
      isNew: false,
      zoneUuid: "zone-b",
      leadZoneIds: ["zone-a"],
      accountManagerZoneIds: ["zone-a", "zone-b"],
    };

    it("can edit own entity", () => {
      expect(
        canEditOwnedEntity({ ...base, createdByUserId: "me", userId: "me" }),
      ).toBe(true);
    });

    it("cannot edit entity created by someone else and not assigned to them", () => {
      expect(
        canEditOwnedEntity({ ...base, createdByUserId: "other-user", userId: "me" }),
      ).toBe(false);
    });

    it("can edit entity assigned to them even if created by someone else", () => {
      expect(
        canEditOwnedEntity({
          ...base,
          createdByUserId: "other-user",
          assignedUserId: "me",
          userId: "me",
        }),
      ).toBe(true);
    });
  });

  describe("AM outside zone", () => {
    it("AM cannot edit entity in a zone they are not assigned to", () => {
      expect(
        canEditOwnedEntity({
          isAdmin: false,
          isNew: false,
          zoneUuid: "zone-c",
          leadZoneIds: ["zone-a"],
          accountManagerZoneIds: ["zone-a", "zone-b"],
          createdByUserId: "other-user",
          userId: "me",
        }),
      ).toBe(false);
    });

    it("AM cannot edit entity with no zone", () => {
      expect(
        canEditOwnedEntity({
          isAdmin: false,
          isNew: false,
          zoneUuid: null,
          leadZoneIds: ["zone-a"],
          accountManagerZoneIds: ["zone-a", "zone-b"],
          createdByUserId: "other-user",
          userId: "me",
        }),
      ).toBe(false);
    });
  });

  it("non-AM without zone info can edit (backwards compat)", () => {
    expect(canEditOwnedEntity({ isAdmin: false, isNew: false })).toBe(true);
  });
});

describe("canSendQuote", () => {
  it("admin can always send", () => {
    expect(
      canSendQuote({
        isAdmin: true,
        zoneUuid: "zone-a",
        leadZoneIds: [],
        accountManagerZoneIds: [],
      }),
    ).toBe(true);
  });

  it("lead AM can send in their lead zone", () => {
    expect(
      canSendQuote({
        isAdmin: false,
        zoneUuid: "zone-a",
        leadZoneIds: ["zone-a"],
        accountManagerZoneIds: ["zone-a", "zone-b"],
      }),
    ).toBe(true);
  });

  it("junior AM cannot send", () => {
    expect(
      canSendQuote({
        isAdmin: false,
        zoneUuid: "zone-b",
        leadZoneIds: ["zone-a"],
        accountManagerZoneIds: ["zone-a", "zone-b"],
      }),
    ).toBe(false);
  });

  it("non-AM cannot send", () => {
    expect(
      canSendQuote({
        isAdmin: false,
        zoneUuid: "zone-a",
        leadZoneIds: [],
        accountManagerZoneIds: [],
      }),
    ).toBe(false);
  });
});
