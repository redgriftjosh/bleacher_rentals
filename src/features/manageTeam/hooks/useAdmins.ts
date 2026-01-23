"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { sql } from "@powersync/kysely-driver";
import { filterBySearch } from "../util/filterBySearch";
import { useSearchQueryStore } from "../state/useSearchQueryStore";

type Admin = {
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  clerkUserId: string | null;
  createdAt: string | null;
  statusUuid: string | null;
  isAccountManager: number;
  isDriver: number;
};

/**
 * Hook to fetch all account managers with their account_manager_id from the database
 */
export function useAdmins(): Admin[] {
  const compiled = db
    .selectFrom("Users as u")
    .leftJoin("AccountManagers as am", (join) =>
      join.onRef("am.user_uuid", "=", "u.id").on("am.is_active", "=", 1)
    )
    .leftJoin("Drivers as d", (join) =>
      join.onRef("d.user_uuid", "=", "u.id").on("d.is_active", "=", 1)
    )
    .select([
      "u.id as userUuid",
      "u.first_name as firstName",
      "u.last_name as lastName",
      "u.email as email",
      "u.clerk_user_id as clerkUserId",
      "u.created_at as createdAt",
      "u.status_uuid as statusUuid",

      // booleans derived from whether the left-joined row exists
      sql<number>`case when am.id is null then 0 else 1 end`.as("isAccountManager"),
      sql<number>`case when d.id is null then 0 else 1 end`.as("isDriver"),
    ])
    .where("u.is_admin", "=", 1)
    .groupBy(["u.id", "u.first_name", "u.last_name", "u.email", "u.clerk_user_id"])
    .orderBy("u.first_name", "asc")
    .orderBy("u.last_name", "asc")
    .compile();

  const { data } = useTypedQuery(compiled, expect<Admin>());
  const searchQuery = useSearchQueryStore((s) => s.searchQuery);

  return filterBySearch(data ?? [], searchQuery);
}
