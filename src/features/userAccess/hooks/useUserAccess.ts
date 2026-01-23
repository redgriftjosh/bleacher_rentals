"use client";
import { useUser } from "@clerk/nextjs";
import { AccessLevel, determineUserAccess } from "../logic/determineAccess";
import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import type { UserAccessData } from "../types";

export type { UserAccessData } from "../types";

/**
 * React Query hook to fetch and determine user access level.
 * Returns the access result and loading/error states.
 */
export function useUserAccess(): {
  accessLevel: AccessLevel;
  reason?: string;
} {
  const { user } = useUser();
  const clerkUserId = user?.id ?? null;

  // Build the SQL with Kysely (type-safe tables/columns)
  const clerkUserIdForQuery = clerkUserId ?? "__no_clerk_user__";

  const compiled = useMemo(() => {
    return db
      .selectFrom("Users as u")
      .leftJoin("AccountManagers as am", (join) =>
        join.onRef("am.user_uuid", "=", "u.id").on("am.is_active", "=", 1)
      )
      .leftJoin("Drivers as d", (join) =>
        join.onRef("d.user_uuid", "=", "u.id").on("d.is_active", "=", 1)
      )
      .select([
        "u.id as id",
        "u.status_uuid",
        "u.is_admin as is_admin",
        "am.id as account_manager_id",
        "d.id as driver_id",
      ])
      .where("u.clerk_user_id", "=", clerkUserIdForQuery)
      .limit(1)
      .compile();
  }, [clerkUserIdForQuery]);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<UserAccessData>());

  // Premise: user is signed in. If Clerk hasn't hydrated yet, show loading.
  if (!clerkUserId) {
    return {
      accessLevel: "loading",
      reason: "Loading user data...",
    };
  }

  // Per request: loading should only be shown if queries are `isLoading`.
  if (isLoading) {
    return {
      accessLevel: "loading",
      reason: "Loading user data...",
    };
  }

  if (error) {
    return {
      accessLevel: "cannot-find-account",
      reason: "Failed to load user access. Please contact support.",
    };
  }

  const result = data?.[0] ?? null;

  // Query completed but found no user row
  if (!result) {
    return {
      accessLevel: "cannot-find-account",
      reason: "User not found (no Users row for this Clerk user)",
    };
  }

  const accessResult = determineUserAccess(result);

  return {
    accessLevel: accessResult.accessLevel,
    reason: accessResult.reason,
  };
}
