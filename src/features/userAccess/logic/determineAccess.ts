import { STATUSES } from "@/app/team/_lib/constants";
import { UserAccessData } from "../hooks/useUserAccess";

// export const USER_STATUS = {
//   ACTIVE: 1,
//   INACTIVE: 2,
//   DEACTIVATED: 3,
// } as const;

export type AccessLevel = "full" | "driver-only" | "denied";

export type AccessResult = {
  accessLevel: AccessLevel;
  reason?: string;
};

/**
 * Determines the access level for a user based on their status and roles.
 *
 * Rules:
 * 1. Deactivated users (status === 3) are always denied
 * 2. Admins get full access
 * 3. Users with active AccountManager role get full access
 * 4. Users with only active Driver role (and not admin/account manager) get driver-only access
 * 5. Users with no roles are denied
 */
export function determineUserAccess(userData: UserAccessData | null): AccessResult {
  // No user data found
  if (!userData) {
    return {
      accessLevel: "denied",
      reason: "User not found",
    };
  }

  // Check if user is deactivated
  if (userData.status_uuid === STATUSES.inactive) {
    return {
      accessLevel: "denied",
      reason: "Account deactivated",
    };
  }

  // Admins get full access
  if (userData.is_admin) {
    return {
      accessLevel: "full",
    };
  }

  // Account managers get full access
  if (userData.account_manager_id) {
    return {
      accessLevel: "full",
    };
  }

  // Driver-only users get limited access
  if (userData.driver_id && !userData.account_manager_id && !userData.is_admin) {
    return {
      accessLevel: "driver-only",
    };
  }

  // No roles assigned
  return {
    accessLevel: "denied",
    reason: "No active roles",
  };
}
