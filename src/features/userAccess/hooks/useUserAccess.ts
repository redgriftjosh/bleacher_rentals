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
  const compiled = useMemo(() => {
    if (!clerkUserId) return null;

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
      .where("u.clerk_user_id", "=", clerkUserId)
      .limit(1)
      .compile();
  }, [clerkUserId]);

  if (!compiled) {
    return {
      accessLevel: "loading",
      reason: "Loading user data...",
    };
  }

  const { data } = useTypedQuery(compiled, expect<UserAccessData>());

  const result = data?.[0];

  // Return early if data hasn't loaded yet
  if (!result) {
    return {
      accessLevel: "loading",
      reason: "Loading user data...",
    };
  }

  const accessResult = determineUserAccess(result);

  return {
    accessLevel: accessResult.accessLevel,
    reason: accessResult.reason,
  };
}
