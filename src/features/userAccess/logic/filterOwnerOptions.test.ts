import { describe, it, expect } from "vitest";
import { filterOwnerOptions } from "./filterOwnerOptions";

describe("filterOwnerOptions (Owner dropdown filtering)", () => {
  const allUsers = [
    { id: "user-admin", name: "Admin User" },
    { id: "user-am-1", name: "AM One" },
    { id: "user-am-2", name: "AM Two" },
    { id: "user-viewer", name: "Viewer User" },
  ];

  // ═══ Admin ═══

  it("admin sees all users", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: true,
      currentUserId: "user-admin",
      disabled: false,
    });
    expect(result).toEqual(allUsers);
  });

  // ═══ AM (non-admin) ═══

  it("AM sees only self when creating (not disabled)", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: "user-am-1",
      disabled: false,
    });
    expect(result).toEqual([{ id: "user-am-1", name: "AM One" }]);
  });

  // ═══ Read-only mode (disabled) ═══

  it("AM sees all users in read-only mode (disabled=true)", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: "user-am-1",
      disabled: true,
    });
    expect(result).toEqual(allUsers);
  });

  it("viewer sees all users in read-only mode (disabled=true)", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: "user-viewer",
      disabled: true,
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
    });
    expect(result).toEqual([{ id: "user-viewer", name: "Viewer User" }]);
  });

  // ═══ Edge cases ═══

  it("returns empty when currentUserId is null and not admin", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: false,
      currentUserId: null,
      disabled: false,
    });
    expect(result).toEqual([]);
  });

  it("returns empty when users list is empty", () => {
    const result = filterOwnerOptions({
      users: [],
      isAdmin: true,
      currentUserId: "user-admin",
      disabled: false,
    });
    expect(result).toEqual([]);
  });

  it("admin disabled=true still returns all users", () => {
    const result = filterOwnerOptions({
      users: allUsers,
      isAdmin: true,
      currentUserId: "user-admin",
      disabled: true,
    });
    expect(result).toEqual(allUsers);
  });
});
