import { STATUSES } from "@/features/manageTeam/constants";
import type { UserAccessData } from "../types";

// export const USER_STATUS = {
//   ACTIVE: 1,
//   INACTIVE: 2,
//   DEACTIVATED: 3,
// } as const;

export type AccessLevel =
  | "full"
  | "driver-only"
  | "account-deactivated"
  | "no-roles-assigned"
  | "cannot-find-account"
  | "loading";

export type AccessResult = {
  accessLevel: Exclude<AccessLevel, "loading">;
  reason?: string;
};

/**
 * Determines the access level for a user based on their status and roles.
 *
 * Rules:
 * 1. Deactivated users are blocked
 * 2. Admins get full access
 * 3. Users with active AccountManager role get full access
 * 4. Users with only active Driver role get driver-only access
 * 5. Users with no roles get no-roles-assigned
 */
export function determineUserAccess(userData: UserAccessData | null): AccessResult {
  // No user data found
  if (!userData) {
    return {
      accessLevel: "cannot-find-account",
      reason: "User not found",
    };
  }

  // Check if user is deactivated
  if (userData.status_uuid === STATUSES.inactive) {
    return {
      accessLevel: "account-deactivated",
    };
  }

  const isAdmin = Boolean(userData.is_admin);

  // Admins get full access
  if (isAdmin) {
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
  if (userData.driver_id) {
    return {
      accessLevel: "driver-only",
    };
  }

  // No roles assigned
  return {
    accessLevel: "no-roles-assigned",
  };
}
