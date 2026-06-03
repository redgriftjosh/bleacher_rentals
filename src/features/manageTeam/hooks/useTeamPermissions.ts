"use client";

import { useUserAccess } from "@/features/userAccess/client";

export type TeamPermissions = {
  isAdmin: boolean;
  isAccountManager: boolean;
  userId: string | null;
  accountManagerId: string | null;
  canCreateUser: boolean;
  canAssignAdmin: boolean;
};

export function useTeamPermissions(): TeamPermissions {
  const access = useUserAccess();

  if (access.status !== "active") {
    return {
      isAdmin: false,
      isAccountManager: false,
      userId: null,
      accountManagerId: null,
      canCreateUser: false,
      canAssignAdmin: false,
    };
  }

  const isAdmin = access.roles.includes("admin");
  const isAccountManager = access.roles.includes("account_manager");

  return {
    isAdmin,
    isAccountManager: isAccountManager && !isAdmin,
    userId: access.userId,
    accountManagerId: access.accountManagerId,
    canCreateUser: isAdmin || isAccountManager,
    canAssignAdmin: isAdmin,
  };
}

/**
 * Determine if the current user can edit a specific team member.
 *
 * @param permissions - from useTeamPermissions()
 * @param targetUser  - the user being viewed/edited
 *
 * Returns: "full" | "read-only"
 */
export function getEditAccess(
  permissions: TeamPermissions,
  targetUserUuid: string | null,
  targetUser: {
    isDriver: boolean;
    accountManagerUuid: string | null;
  },
): "full" | "read-only" {
  if (permissions.isAdmin) return "full";

  if (permissions.isAccountManager) {
    // AM can edit own profile
    if (targetUserUuid && targetUserUuid === permissions.userId) return "full";

    // AM can edit drivers assigned to them
    if (
      targetUser.isDriver &&
      (targetUser.accountManagerUuid === permissions.accountManagerId ||
        targetUser.accountManagerUuid === null)
    ) {
      return "full";
    }
  }

  return "read-only";
}
