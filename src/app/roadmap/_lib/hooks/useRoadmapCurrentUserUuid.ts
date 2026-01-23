"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useUser } from "@clerk/nextjs";
import { useMemo } from "react";

type Row = { userUuid: string };

export function useRoadmapCurrentUserUuid() {
  const { user } = useUser();
  const clerkUserId = user?.id ?? null;

  const clerkUserIdForQuery = clerkUserId ?? "__no_clerk_user__";

  const compiled = useMemo(() => {
    return db
      .selectFrom("Users as u")
      .select(["u.id as userUuid"]) 
      .where("u.clerk_user_id", "=", clerkUserIdForQuery)
      .limit(1)
      .compile();
  }, [clerkUserIdForQuery]);

  const { data, isLoading, error } = useTypedQuery(compiled, expect<Row>());

  return {
    userUuid: clerkUserId ? data?.[0]?.userUuid ?? null : null,
    isLoading: !clerkUserId || isLoading,
    error,
  };
}
