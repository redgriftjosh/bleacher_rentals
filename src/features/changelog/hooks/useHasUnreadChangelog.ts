"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useCurrentUser } from "@/hooks/db/useCurrentUser";
import { useMemo } from "react";
import { toEpochMs } from "../util/timestamps";

type LatestRow = { latest_released_at: string | null };

/**
 * True when a release exists that the current user has not seen.
 *
 * Deliberately returns false while anything is still loading or missing — a
 * false indicator that flashes on every cold start is worse than a late one.
 */
export function useHasUnreadChangelog(): boolean {
  const { data: userData } = useCurrentUser();

  const latestCompiled = useMemo(
    () =>
      db
        .selectFrom("ChangeLog")
        .select((eb) => eb.fn.max("released_at").as("latest_released_at"))
        .compile(),
    [],
  );

  const { data: latestData } = useTypedQuery(latestCompiled, expect<LatestRow>());

  const latest = latestData?.[0]?.latest_released_at ?? null;
  const user = userData?.[0];

  // No releases yet, or the user row hasn't synced — show nothing.
  if (!latest || !user) return false;

  // Never opened the page, but releases exist.
  if (!user.changelog_last_read_at) return true;

  const latestMs = toEpochMs(latest);
  const lastReadMs = toEpochMs(user.changelog_last_read_at);
  if (latestMs === null) return false;
  if (lastReadMs === null) return true;

  return latestMs > lastReadMs;
}
