"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { sql } from "@powersync/kysely-driver";
import { filterBySearch } from "../util/filterBySearch";
import { useSearchQueryStore } from "../state/useSearchQueryStore";

type IncompleteUser = {
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  clerkUserId: string | null;
  createdAt: string | null;
  statusUuid: string | null;
};

/**
 * Hook to fetch users who have no roles assigned (not admin, not account manager, not driver)
 */
export function useIncomplete(): IncompleteUser[] {
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
    ])
    .where((eb) =>
      eb.and([
        eb("u.is_admin", "=", 0),
        eb("am.id", "is", null),
        eb("d.id", "is", null),
      ])
    )
    .orderBy("u.first_name", "asc")
    .orderBy("u.last_name", "asc")
    .compile();

  const { data } = useTypedQuery(compiled, expect<IncompleteUser>());
  const searchQuery = useSearchQueryStore((s) => s.searchQuery);

  return filterBySearch(data ?? [], searchQuery);
}
