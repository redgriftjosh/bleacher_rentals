import { describe, it, expect } from "vitest";
import { getEditAccess, TeamPermissions } from "./useTeamPermissions";

const adminPermissions: TeamPermissions = {
  isAdmin: true,
  isAccountManager: false,
  userId: "admin-user-1",
  accountManagerId: null,
  canCreateUser: true,
  canAssignAdmin: true,
};

const amPermissions: TeamPermissions = {
  isAdmin: false,
  isAccountManager: true,
  userId: "am-user-1",
  accountManagerId: "am-id-1",
  canCreateUser: true,
  canAssignAdmin: false,
};

const viewerPermissions: TeamPermissions = {
  isAdmin: false,
  isAccountManager: false,
  userId: "viewer-user-1",
  accountManagerId: null,
  canCreateUser: false,
  canAssignAdmin: false,
};

describe("getEditAccess", () => {
  // --- Admin ---
  it("admin: full access to any user", () => {
    expect(
      getEditAccess(adminPermissions, "some-user", {
        isDriver: false,
        accountManagerUuid: null,
      }),
    ).toBe("full");
  });

  it("admin: full access to driver assigned to other AM", () => {
    expect(
      getEditAccess(adminPermissions, "driver-user", {
        isDriver: true,
        accountManagerUuid: "other-am-id",
      }),
    ).toBe("full");
  });

  // --- Account Manager: own profile ---
  it("AM: full access to own profile", () => {
    expect(
      getEditAccess(amPermissions, "am-user-1", {
        isDriver: false,
        accountManagerUuid: null,
      }),
    ).toBe("full");
  });

  // --- Account Manager: own drivers ---
  it("AM: full access to driver assigned to them", () => {
    expect(
      getEditAccess(amPermissions, "driver-user-1", {
        isDriver: true,
        accountManagerUuid: "am-id-1",
      }),
    ).toBe("full");
  });

  // --- Account Manager: unassigned drivers ---
  it("AM: full access to unassigned driver", () => {
    expect(
      getEditAccess(amPermissions, "driver-user-2", {
        isDriver: true,
        accountManagerUuid: null,
      }),
    ).toBe("full");
  });

  // --- Account Manager: other AM's drivers ---
  it("AM: read-only for driver assigned to other AM", () => {
    expect(
      getEditAccess(amPermissions, "driver-user-3", {
        isDriver: true,
        accountManagerUuid: "other-am-id",
      }),
    ).toBe("read-only");
  });

  // --- Account Manager: non-driver users ---
  it("AM: read-only for non-driver user", () => {
    expect(
      getEditAccess(amPermissions, "some-user", {
        isDriver: false,
        accountManagerUuid: null,
      }),
    ).toBe("read-only");
  });

  it("AM: read-only for another AM user", () => {
    expect(
      getEditAccess(amPermissions, "other-am-user", {
        isDriver: false,
        accountManagerUuid: "other-am-id",
      }),
    ).toBe("read-only");
  });

  // --- Viewer ---
  it("viewer: read-only for any user", () => {
    expect(
      getEditAccess(viewerPermissions, "some-user", {
        isDriver: false,
        accountManagerUuid: null,
      }),
    ).toBe("read-only");
  });

  it("viewer: read-only even for unassigned driver", () => {
    expect(
      getEditAccess(viewerPermissions, "driver-user", {
        isDriver: true,
        accountManagerUuid: null,
      }),
    ).toBe("read-only");
  });
});
