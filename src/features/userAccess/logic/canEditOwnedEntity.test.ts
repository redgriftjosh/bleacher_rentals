import { describe, it, expect } from "vitest";
import { canEditOwnedEntity } from "./canEditOwnedEntity";

describe("canEditOwnedEntity (Events / MaintenanceEvents)", () => {
  // ═══ Admin ═══

  it("admin can edit any event", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: true,
        isNew: false,
        currentUserId: "admin-1",
        ownerUserUuid: "other-user",
      }),
    ).toBe(true);
  });

  it("admin can create new event", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: true,
        isNew: true,
        currentUserId: "admin-1",
        ownerUserUuid: null,
      }),
    ).toBe(true);
  });

  // ═══ AM: creating ═══

  it("AM can create new event", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: true,
        currentUserId: "am-user-1",
        ownerUserUuid: null,
      }),
    ).toBe(true);
  });

  // ═══ AM: own event ═══

  it("AM can edit own event (owner = self)", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        ownerUserUuid: "am-user-1",
      }),
    ).toBe(true);
  });

  // ═══ AM: someone else's event ═══

  it("AM cannot edit event owned by another user", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        ownerUserUuid: "am-user-2",
      }),
    ).toBe(false);
  });

  it("AM cannot edit event owned by admin", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: false,
        currentUserId: "am-user-1",
        ownerUserUuid: "admin-1",
      }),
    ).toBe(false);
  });

  // ═══ Edge cases ═══

  it("user with null userId cannot edit anything", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: false,
        currentUserId: null,
        ownerUserUuid: null,
      }),
    ).toBe(false);
  });

  it("new entity always editable even with null userId (canCreate defaults true)", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: true,
        currentUserId: null,
        ownerUserUuid: null,
      }),
    ).toBe(true);
  });

  // ═══ Viewer (canCreate = false) ═══

  it("viewer cannot create new event (canCreate=false)", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: true,
        currentUserId: "viewer-1",
        ownerUserUuid: null,
        canCreate: false,
      }),
    ).toBe(false);
  });

  it("viewer cannot edit existing event owned by someone else", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: false,
        currentUserId: "viewer-1",
        ownerUserUuid: "am-user-1",
        canCreate: false,
      }),
    ).toBe(false);
  });

  it("AM can create new event (canCreate=true)", () => {
    expect(
      canEditOwnedEntity({
        isAdmin: false,
        isNew: true,
        currentUserId: "am-user-1",
        ownerUserUuid: null,
        canCreate: true,
      }),
    ).toBe(true);
  });
});
