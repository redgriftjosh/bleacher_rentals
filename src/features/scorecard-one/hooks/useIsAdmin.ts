"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useUser } from "@clerk/nextjs";
import { useMemo } from "react";

type AdminCheckRow = { isAdmin: number | null };

export function useIsAdmin(): boolean {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const query = useMemo(
    () =>
      db
        .selectFrom("Users as u")
        .select(["u.is_admin as isAdmin"])
        .where("u.clerk_user_id", "=", clerkId)
        .limit(1)
        .compile(),
    [clerkId],
  );

  const { data } = useTypedQuery(query, expect<AdminCheckRow>());

  return (data?.[0]?.isAdmin ?? 0) === 1;
}
