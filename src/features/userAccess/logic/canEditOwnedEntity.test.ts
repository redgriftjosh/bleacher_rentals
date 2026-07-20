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
    it("can edit any entity (lead in any zone = full access)", () => {
      expect(
        canEditOwnedEntity({
          isAdmin: false,
          isNew: false,
          isAccountManager: true,
          leadZoneIds: ["zone-a"],
          accountManagerZoneIds: ["zone-a", "zone-b"],
          createdByUserId: "other-user",
          userId: "me",
        }),
      ).toBe(true);
    });
  });

  describe("Junior AM (no lead zones)", () => {
    const base = {
      isAdmin: false,
      isNew: false,
      isAccountManager: true,
      leadZoneIds: [] as string[],
      accountManagerZoneIds: ["zone-a", "zone-b"],
    };

    it("can edit own entity", () => {
      expect(
        canEditOwnedEntity({ ...base, createdByUserId: "me", userId: "me" }),
      ).toBe(true);
    });

    it("can edit entity assigned to them", () => {
      expect(
        canEditOwnedEntity({
          ...base,
          createdByUserId: "other-user",
          assignedUserId: "me",
          userId: "me",
        }),
      ).toBe(true);
    });

    it("cannot edit entity created by and assigned to someone else", () => {
      expect(
        canEditOwnedEntity({
          ...base,
          createdByUserId: "other-user",
          assignedUserId: "other-user",
          userId: "me",
        }),
      ).toBe(false);
    });

    it("cannot edit entity not assigned to them", () => {
      expect(
        canEditOwnedEntity({
          ...base,
          createdByUserId: "other-user",
          userId: "me",
        }),
      ).toBe(false);
    });
  });

  describe("AM without zones", () => {
    it("cannot edit entity not assigned to them", () => {
      expect(
        canEditOwnedEntity({
          isAdmin: false,
          isNew: false,
          isAccountManager: true,
          leadZoneIds: [],
          accountManagerZoneIds: [],
          createdByUserId: "other-user",
          userId: "me",
        }),
      ).toBe(false);
    });

    it("can edit entity assigned to them", () => {
      expect(
        canEditOwnedEntity({
          isAdmin: false,
          isNew: false,
          isAccountManager: true,
          leadZoneIds: [],
          accountManagerZoneIds: [],
          createdByUserId: "other-user",
          assignedUserId: "me",
          userId: "me",
        }),
      ).toBe(true);
    });
  });

  it("non-AM without zone info can edit (backwards compat)", () => {
    expect(canEditOwnedEntity({ isAdmin: false, isNew: false })).toBe(true);
  });

  describe("part 3 — event with bleacher in inaccessible zone", () => {
    const base = {
      isAdmin: false,
      isNew: false,
      isAccountManager: true,
      accountManagerZoneIds: ["zone-a"],
      leadZoneIds: ["zone-a"],
      userId: "me",
    };

    it("admin can always edit despite inaccessible bleacher", () => {
      expect(
        canEditOwnedEntity({
          ...base,
          isAdmin: true,
          createdByUserId: "other",
          eventBleacherZoneIds: ["zone-z"],
        }),
      ).toBe(true);
    });

    it("non-owner blocked when a bleacher is in a zone they can't access", () => {
      expect(
        canEditOwnedEntity({
          ...base,
          createdByUserId: "other",
          eventBleacherZoneIds: ["zone-a", "zone-z"],
        }),
      ).toBe(false);
    });

    it("owner can still edit even with inaccessible bleacher", () => {
      expect(
        canEditOwnedEntity({
          ...base,
          createdByUserId: "me",
          eventBleacherZoneIds: ["zone-z"],
        }),
      ).toBe(true);
    });

    it("lead can edit when all bleachers are in accessible zones", () => {
      expect(
        canEditOwnedEntity({
          ...base,
          createdByUserId: "other",
          eventBleacherZoneIds: ["zone-a"],
        }),
      ).toBe(true);
    });
  });
});

describe("canSendQuote", () => {
  it("admin can always send", () => {
    expect(canSendQuote({ isAdmin: true, leadZoneIds: [] })).toBe(true);
  });

  it("lead AM can send (not zone-dependent)", () => {
    expect(canSendQuote({ isAdmin: false, leadZoneIds: ["zone-a"] })).toBe(true);
  });

  it("junior AM cannot send", () => {
    expect(canSendQuote({ isAdmin: false, leadZoneIds: [] })).toBe(false);
  });

  it("non-AM cannot send", () => {
    expect(canSendQuote({ isAdmin: false, leadZoneIds: [] })).toBe(false);
  });
});
