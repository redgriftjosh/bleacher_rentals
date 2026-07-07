"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type MentionRow = {
  message_id: string | null;
  mentioned_user_uuid: string | null;
};

/** messageId → user uuids mentioned in that message */
export type EventMentionsByMessage = Map<string, string[]>;

/**
 * Reactive @mention rows for all messages in one event chat.
 */
export function useEventMessageMentions(eventUuid: string) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventMessageMentions as men")
        .innerJoin("EventMessages as m", "m.id", "men.message_id")
        .select(["men.message_id as message_id", "men.mentioned_user_uuid as mentioned_user_uuid"])
        .where("m.event_uuid", "=", eventUuid)
        .compile(),
    [eventUuid],
  );

  const { data } = useTypedQuery(compiled, expect<MentionRow>());

  const mentionsByMessage = useMemo<EventMentionsByMessage>(() => {
    const map = new Map<string, string[]>();
    for (const row of data ?? []) {
      if (!row.message_id || !row.mentioned_user_uuid) continue;
      const existing = map.get(row.message_id) ?? [];
      existing.push(row.mentioned_user_uuid);
      map.set(row.message_id, existing);
    }
    return map;
  }, [data]);

  return { mentionsByMessage };
}
