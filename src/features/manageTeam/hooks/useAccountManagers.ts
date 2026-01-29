"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { sql } from "@powersync/kysely-driver";
import { filterBySearch } from "../util/filterBySearch";
import { useSearchQueryStore } from "../state/useSearchQueryStore";

export type AccountManagerOption = {
  accountManagerUuid: string;
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  clerkUserId: string | null;
  createdAt: string | null;
  statusUuid: string | null;
  numDrivers: number;
};

/**
 * Hook to fetch all account managers with their account_manager_id from the database
 */
export function useAccountManagers(filter: boolean = true): AccountManagerOption[] {
  const compiled = db
    .selectFrom("AccountManagers as am")
    .innerJoin("Users as u", "u.id", "am.user_uuid")
    .leftJoin(
      "Drivers as d",
      (join) => join.onRef("d.account_manager_uuid", "=", "am.id").on("d.is_active", "=", 1), // only active drivers
    )
    .select([
      "am.id as accountManagerUuid",
      "u.id as userUuid",
      "u.first_name as firstName",
      "u.last_name as lastName",
      "u.email as email",
      "u.clerk_user_id as clerkUserId",
      "u.created_at as createdAt",
      "u.status_uuid as statusUuid",
      sql<number>`count(d.id)`.as("numDrivers"),
    ])
    .where("am.is_active", "=", 1)
    .groupBy(["am.id", "u.id", "u.first_name", "u.last_name", "u.email", "u.clerk_user_id"])
    .orderBy("u.first_name", "asc")
    .orderBy("u.last_name", "asc")
    .compile();

  const { data } = useTypedQuery(compiled, expect<AccountManagerOption>());
  const searchQuery = useSearchQueryStore((s) => s.searchQuery);

  return filter ? filterBySearch(data ?? [], searchQuery) : (data ?? []);
}
