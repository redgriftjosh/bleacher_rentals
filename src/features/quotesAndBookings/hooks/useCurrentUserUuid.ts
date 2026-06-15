"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export function useCurrentUserUuid(): string | null {
  const { user } = useUser();
  const clerkUserId = user?.id ?? "__none__";

  const compiled = useMemo(
    () =>
      db
        .selectFrom("Users")
        .select(["id"])
        .where("clerk_user_id", "=", clerkUserId)
        .limit(1)
        .compile(),
    [clerkUserId],
  );

  const { data } = useTypedQuery(compiled, expect<{ id: string }>());
  return data?.[0]?.id ?? null;
}
