import { useUser } from "@clerk/nextjs";
import { AccessLevel, determineUserAccess } from "../logic/determineAccess";
import { useQuery } from "@powersync/react";
import { ACCOUNT_MANAGERS_TABLE, DRIVERS_TABLE, USERS_TABLE } from "@/lib/powersync/AppSchema";
import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export type UserAccessData = {
  status_uuid: string | null;
  id: string;
  is_admin: number | null;
  account_manager_id: string | null;
  driver_id: string | null;
};

/**
 * React Query hook to fetch and determine user access level.
 * Returns the access result and loading/error states.
 */
export function useUserAccess(): { accessLevel: AccessLevel; reason?: string } {
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
      accessLevel: "denied",
      reason: "Loading user data...",
    };
  }

  const { data } = useTypedQuery(compiled, expect<UserAccessData>());

  // const { data: results } = useQuery(
  //   compiled?.sql ?? "select 1 where 0",
  //   (compiled?.parameters as any[]) ?? []
  // );

  const result = data?.[0];

  // const { data: results } = useQuery(
  //   `SELECT
  //       u.id,
  //       u.status,
  //       u.is_admin,
  //       am.id as account_manager_id,
  //       d.id as driver_id
  //      FROM ${USERS_TABLE} u
  //      LEFT JOIN ${ACCOUNT_MANAGERS_TABLE} am ON am.user_uuid = u.id AND am.is_active = 1
  //      LEFT JOIN ${DRIVERS_TABLE} d ON d.user_uuid = u.id AND d.is_active = 1
  //      WHERE u.clerk_user_id = ?`,
  //   [user?.id]
  // );

  // const result = results?.[0];

  // Return early if data hasn't loaded yet
  if (!result) {
    return {
      accessLevel: "denied",
      reason: "Loading user data...",
    };
  }

  const userData: UserAccessData = {
    id: result.id,
    status_uuid: result.status_uuid,
    is_admin: result.is_admin,
    account_manager_id: result.account_manager_id,
    driver_id: result.driver_id,
  };

  console.log(`userData ${JSON.stringify(userData, null, 2)}`);

  const accessResult = determineUserAccess(userData);

  console.log(`accessResult ${JSON.stringify(accessResult, null, 2)}`);

  // const accessResult = useMemo(() => {
  //   return determineUserAccess(userData);
  // }, [userData]);

  return {
    accessLevel: accessResult.accessLevel,
    reason: accessResult.reason,
  };
}
