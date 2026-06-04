"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type EventTypeRow = {
  id: string;
  name: string | null;
};

export type EventTypeOption = {
  id: string;
  name: string;
};

export function useEventTypes(): { eventTypes: EventTypeOption[]; isLoading: boolean } {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventTypes")
        .select(["id", "name"])
        .where("deleted", "=", 0)
        .orderBy("name")
        .compile(),
    [],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<EventTypeRow>());

  const eventTypes = useMemo(
    () =>
      (data ?? []).map((r) => ({
        id: r.id,
        name: r.name ?? "",
      })),
    [data],
  );

  return { eventTypes, isLoading };
}
