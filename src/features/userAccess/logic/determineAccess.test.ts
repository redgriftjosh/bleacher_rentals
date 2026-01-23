import { describe, it, expect } from "vitest";
import { determineUserAccess } from "./determineAccess";
import type { UserAccessData } from "../types";
import { STATUSES } from "@/features/manageTeam/constants";

describe("determineUserAccess", () => {
  it("cannot-find-account when user data is null", () => {
    const result = determineUserAccess(null);
    expect(result.accessLevel).toBe("cannot-find-account");
    expect(result.reason).toBe("User not found");
  });

  it("account-deactivated regardless of roles", () => {
    const userData: UserAccessData = {
      id: "1",
      status_uuid: STATUSES.inactive,
      is_admin: 1,
      account_manager_id: "am-1",
      driver_id: "d-1",
    };

    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("account-deactivated");
  });

  it("grants full access to admins", () => {
    const userData: UserAccessData = {
      id: "1",
      status_uuid: null,
      is_admin: 1,
      account_manager_id: null,
      driver_id: null,
    };

    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("full");
  });

  it("grants full access to account managers", () => {
    const userData: UserAccessData = {
      id: "1",
      status_uuid: null,
      is_admin: 0,
      account_manager_id: "am-1",
      driver_id: null,
    };

    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("full");
  });

  it("grants driver-only access to users with only driver role", () => {
    const userData: UserAccessData = {
      id: "1",
      status_uuid: null,
      is_admin: 0,
      account_manager_id: null,
      driver_id: "d-1",
    };

    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("driver-only");
  });

  it("no-roles-assigned when no roles", () => {
    const userData: UserAccessData = {
      id: "1",
      status_uuid: null,
      is_admin: 0,
      account_manager_id: null,
      driver_id: null,
    };

    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("no-roles-assigned");
  });
});
