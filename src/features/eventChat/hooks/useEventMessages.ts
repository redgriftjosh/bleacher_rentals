"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import type { Tables } from "../../../../database.types";

/** Raw row shape from PowerSync (booleans stored as 0/1 integers). */
type Row = {
  id: string;
  event_uuid: string | null;
  user_uuid: string | null;
  body: string | null;
  created_at: string | null;
  edited_at: string | null;
  is_system: number | null;
};

export type EventMessage = Pick<
  Tables<"EventMessages">,
  "id" | "event_uuid" | "user_uuid" | "body" | "created_at" | "edited_at" | "is_system"
>;

/** Normalizes PowerSync integers/nulls into app-friendly types. */
function toMessage(row: Row): EventMessage {
  return {
    id: row.id,
    event_uuid: row.event_uuid ?? "",
    user_uuid: row.user_uuid ?? "",
    body: row.body ?? "",
    created_at: row.created_at ?? "",
    edited_at: row.edited_at ?? null,
    is_system: row.is_system === 1,
  };
}

/**
 * Reactive hook: all messages for one event, oldest first.
 * Re-runs when EventMessages changes locally or via sync.
 */
export function useEventMessages(eventUuid: string) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventMessages")
        .select(["id", "event_uuid", "user_uuid", "body", "created_at", "edited_at", "is_system"])
        .where("event_uuid", "=", eventUuid)
        .orderBy("created_at", "asc")
        .compile(),
    [eventUuid],
  );

  const { data, isLoading, error } = useTypedQuery(compiled, expect<Row>());

  const messages = useMemo<EventMessage[]>(() => (data ?? []).map(toMessage), [data]);

  return { messages, isLoading, error };
}
