"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

type Row = {
  id: string;
  message_id: string | null;
  user_uuid: string | null;
  read_at: string | null;
};

/** messageId → list of user uuids who have read that message */
export type EventReadReceiptMap = Map<string, string[]>;

/**
 * Reactive read receipts for all messages in one event chat.
 * Joins receipts to messages so we only get data for this event.
 */
export function useEventReadReceipts(eventUuid: string) {
  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventMessageReadReceipts as rr")
        .innerJoin("EventMessages as m", "m.id", "rr.message_id")
        .select([
          "rr.id as id",
          "rr.message_id as message_id",
          "rr.user_uuid as user_uuid",
          "rr.read_at as read_at",
        ])
        .where("m.event_uuid", "=", eventUuid)
        .compile(),
    [eventUuid],
  );

  const { data } = useTypedQuery(compiled, expect<Row>());

  // Group by message id for O(1) lookup when rendering each bubble.
  const receiptsByMessage = useMemo<EventReadReceiptMap>(() => {
    const map = new Map<string, string[]>();
    for (const r of data ?? []) {
      if (!r.message_id || !r.user_uuid) continue;
      const existing = map.get(r.message_id) ?? [];
      existing.push(r.user_uuid);
      map.set(r.message_id, existing);
    }
    return map;
  }, [data]);

  return { receiptsByMessage };
}
