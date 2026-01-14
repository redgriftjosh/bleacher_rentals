import { describe, it, expect } from "vitest";
import { determineUserAccess, USER_STATUS, AccessResult } from "./determineAccess";
import { UserAccessData } from "../hooks/useUserAccess";
import { STATUSES } from "@/features/manageTeam/constants";

describe("determineUserAccess", () => {
  it("should deny access when user data is null", () => {
    const result = determineUserAccess(null);
    expect(result.accessLevel).toBe("denied");
    expect(result.reason).toBe("User not found");
  });

  it("should deny access for deactivated users regardless of roles", () => {
    const userData: UserAccessData = {
      id: "1",
      status_uuid: STATUSES.inactive,
      is_admin: 1,
      hasAccountManagerRole: true,
      hasDriverRole: true,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("denied");
    expect(result.reason).toBe("Account deactivated");
  });

  it("should grant full access to admins", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.ACTIVE,
      is_admin: true,
      hasAccountManagerRole: false,
      hasDriverRole: false,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("full");
    expect(result.reason).toBeUndefined();
  });

  it("should grant full access to account managers", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.ACTIVE,
      is_admin: false,
      hasAccountManagerRole: true,
      hasDriverRole: false,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("full");
    expect(result.reason).toBeUndefined();
  });

  it("should grant full access to users who are both account manager and admin", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.ACTIVE,
      is_admin: true,
      hasAccountManagerRole: true,
      hasDriverRole: false,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("full");
    expect(result.reason).toBeUndefined();
  });

  it("should grant driver-only access to users with only driver role", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.ACTIVE,
      is_admin: false,
      hasAccountManagerRole: false,
      hasDriverRole: true,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("driver-only");
    expect(result.reason).toBeUndefined();
  });

  it("should deny access to users with no roles", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.ACTIVE,
      is_admin: false,
      hasAccountManagerRole: false,
      hasDriverRole: false,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("denied");
    expect(result.reason).toBe("No active roles");
  });

  it("should grant full access to inactive users who are admins", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.INACTIVE,
      is_admin: true,
      hasAccountManagerRole: false,
      hasDriverRole: false,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("full");
  });

  it("should grant driver-only access to inactive users with driver role", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.INACTIVE,
      is_admin: false,
      hasAccountManagerRole: false,
      hasDriverRole: true,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("driver-only");
  });

  it("should prioritize admin over driver role", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.ACTIVE,
      is_admin: true,
      hasAccountManagerRole: false,
      hasDriverRole: true,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("full");
  });

  it("should prioritize account manager over driver role", () => {
    const userData: UserAccessData = {
      user_uuid: "1",
      status: USER_STATUS.ACTIVE,
      is_admin: false,
      hasAccountManagerRole: true,
      hasDriverRole: true,
    };
    const result = determineUserAccess(userData);
    expect(result.accessLevel).toBe("full");
  });
});
