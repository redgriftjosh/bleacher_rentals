"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

/**
 * Reactive read of the manual "entered in QuickBooks Online" flag.
 * Stored locally as 0/1; missing rows read as false, matching the DB default.
 */
export function useEventIsQbo(eventId: string): boolean {
  const compiled = useMemo(
    () => db.selectFrom("Events").select(["is_qbo"]).where("id", "=", eventId).compile(),
    [eventId],
  );

  const { data } = useTypedQuery(compiled, expect<{ is_qbo: number | null }>());
  return data?.[0]?.is_qbo === 1;
}
