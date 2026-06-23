import { describe, it, expect } from "vitest";
import { filterOwnerOptions } from "./filterOwnerOptions";

describe("filterOwnerOptions (Owner dropdown filtering)", () => {
  const allUsers = [
    { id: "user-admin", name: "Admin User", is_admin: true },
    { id: "user-am-1", name: "AM One", is_admin: false },
    { id: "user-am-2", name: "AM Two", is_admin: false },
    { id: "user-viewer", name: "Viewer User", is_admin: false },
  ];

  const accountManagerUserIds = new Set(["user-am-1", "user-am-2"]);

  // ═══ Admin ═══

  it("admin sees only admins and account managers", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: true,
      currentUserId: "user-admin",
      disabled: false,
      accountManagerUserIds,
    });
    expect(result).toEqual([
      { id: "user-admin", name: "Admin User", is_admin: true },
      { id: "user-am-1", name: "AM One", is_admin: false },
      { id: "user-am-2", name: "AM Two", is_admin: false },
    ]);
  });

  // ═══ AM (non-admin) ═══

  it("AM sees all admins and account managers (can assign any AM as owner)", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: "user-am-1",
      disabled: false,
      accountManagerUserIds,
    });
    expect(result).toEqual([
      { id: "user-admin", name: "Admin User", is_admin: true },
      { id: "user-am-1", name: "AM One", is_admin: false },
      { id: "user-am-2", name: "AM Two", is_admin: false },
    ]);
  });

  // ═══ Read-only mode (disabled) ═══

  it("AM sees all users in read-only mode (disabled=true)", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: "user-am-1",
      disabled: true,
      accountManagerUserIds,
    });
    expect(result).toEqual(allUsers);
  });

  it("viewer sees all users in read-only mode (disabled=true)", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: "user-viewer",
      disabled: true,
      accountManagerUserIds,
    });
    expect(result).toEqual(allUsers);
  });

  // ═══ Viewer (non-admin, non-AM) — form not disabled ═══

  it("viewer sees only self when not disabled", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: "user-viewer",
      disabled: false,
      accountManagerUserIds,
    });
    expect(result).toEqual([{ id: "user-viewer", name: "Viewer User", is_admin: false }]);
  });

  // ═══ Deactivated users ═══

  it("excludes deactivated users from the selectable list when inactiveStatusUuid is set", () => {
    const usersWithStatus = [
      { id: "user-admin", is_admin: true, status_uuid: "active" },
      { id: "user-am-1", is_admin: false, status_uuid: "active" },
      { id: "user-am-2", is_admin: false, status_uuid: "inactive" },
    ];
    const result = filterOwnerOptions({
      users: usersWithStatus,
      isAdmin: false,
      currentUserId: "user-am-1",
      disabled: false,
      accountManagerUserIds: new Set(["user-am-1", "user-am-2"]),
      inactiveStatusUuid: "inactive",
    });
    expect(result.map((u) => u.id)).toEqual(["user-admin", "user-am-1"]);
  });

  it("still shows deactivated users in read-only mode (disabled=true) so the owner name renders", () => {
    const usersWithStatus = [
      { id: "user-am-1", is_admin: false, status_uuid: "active" },
      { id: "user-am-2", is_admin: false, status_uuid: "inactive" },
    ];
    const result = filterOwnerOptions({
      users: usersWithStatus,
      isAdmin: false,
      currentUserId: "user-am-1",
      disabled: true,
      accountManagerUserIds: new Set(["user-am-1", "user-am-2"]),
      inactiveStatusUuid: "inactive",
    });
    expect(result).toEqual(usersWithStatus);
  });

  // ═══ Edge cases ═══

  it("returns empty when currentUserId is null and not admin", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: null,
      disabled: false,
      accountManagerUserIds,
    });
    expect(result).toEqual([]);
  });

  it("returns empty when users list is empty", () => {
    const result = filterOwnerOptions({
      users: [],
      isAdmin: true,
      currentUserId: "user-admin",
      disabled: false,
      accountManagerUserIds,
    });
    expect(result).toEqual([]);
  });

  it("admin disabled=true still returns all users", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: true,
      currentUserId: "user-admin",
      disabled: true,
      accountManagerUserIds,
    });
    expect(result).toEqual(allUsers);
  });
});
