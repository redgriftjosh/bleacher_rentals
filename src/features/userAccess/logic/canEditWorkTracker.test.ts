import { describe, it, expect } from "vitest";
import { canEditWorkTracker } from "./canEditWorkTracker";

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

  it("AM can edit any existing work tracker", () => {
    expect(
      canEditWorkTracker({ isAdmin: false, isAccountManager: true, isNew: false }),
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
});
