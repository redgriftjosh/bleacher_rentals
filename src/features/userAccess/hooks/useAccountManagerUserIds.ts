"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

export function useAccountManagerUserIds(): Set<string> {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("AccountManagers")
        .select(["user_uuid"])
        .where("is_active", "=", 1)
        .compile(),
    [],
  );

  const { data = [] } = useTypedQuery(
    compiled,
    expect<{ user_uuid: string | null }>(),
  );

  return useMemo(
    () => new Set(data.map((r) => r.user_uuid).filter((id): id is string => id !== null)),
    [data],
  );
}
