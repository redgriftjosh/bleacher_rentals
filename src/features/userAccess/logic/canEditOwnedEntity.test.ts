import { describe, it, expect } from "vitest";
import { canEditOwnedEntity } from "./canEditOwnedEntity";

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

  it("AM can edit existing entity", () => {
    expect(canEditOwnedEntity({ isAdmin: false, isNew: false })).toBe(true);
  });

  it("viewer cannot create (canCreate=false)", () => {
    expect(canEditOwnedEntity({ isAdmin: false, isNew: true, canCreate: false })).toBe(false);
  });

  it("viewer cannot edit existing (canCreate=false)", () => {
    expect(canEditOwnedEntity({ isAdmin: false, isNew: false, canCreate: false })).toBe(false);
  });
});
