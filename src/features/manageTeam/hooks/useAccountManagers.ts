"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useUsersStore } from "@/state/userStore";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export type AccountManagerOption = {
  accountManagerUuid: string;
  userUuid: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  clerkUserId: string | null;
};

/**
 * Hook to fetch all account managers with their account_manager_id from the database
 */
export function useAccountManagers(): AccountManagerOption[] {
  const compiled = db
    .selectFrom("AccountManagers as am")
    .innerJoin("Users as u", "u.id", "am.user_uuid")
    .select([
      "am.id as accountManagerUuid",
      "u.id as userUuid",
      "u.first_name as firstName",
      "u.last_name as lastName",
      "u.email as email",
      "u.clerk_user_id as clerkUserId",
    ])
    .where("am.is_active", "=", 1)
    .orderBy("u.first_name", "asc")
    .orderBy("u.last_name", "asc")
    .compile();

  const { data } = useTypedQuery(compiled, expect<AccountManagerOption>());

  return data ?? [];
}
