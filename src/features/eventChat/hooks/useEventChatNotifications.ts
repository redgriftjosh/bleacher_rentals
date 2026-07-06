"use client";

import { useMemo } from "react";
import { sql } from "@powersync/kysely-driver";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";

type UnreadChatRow = {
  eventUuid: string | null;
  eventName: string | null;
  latestMessageAt: string;
};

/** One row per event in the notifications modal (not per message). */
export type EventChatNotification = {
  eventUuid: string;
  eventName: string;
  latestMessageAt: string;
  /** Reserved for @mention sorting/highlight — always false until mentions ship. */
  hasUnreadMention: boolean;
};

/**
 * Unread internal chat notifications for the current user.
 *
 * Rules:
 * - Only subscribed events (EventSubscriptions) can notify.
 * - One notification per chat, regardless of how many unread messages.
 * - Unread = message from someone else with no read receipt for this user.
 * - Clears reactively when the user opens the chat (markEventMessagesRead).
 */
export function useEventChatNotifications() {
  const userUuid = usePermissionsStore((s) => s.userId);
  const safeUuid = userUuid ?? "__none__";

  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventSubscriptions as es")
        .innerJoin("EventMessages as m", "m.event_uuid", "es.event_uuid")
        .innerJoin("Events as e", "e.id", "es.event_uuid")
        .leftJoin("EventMessageReadReceipts as rr", (join) =>
          join
            .onRef("rr.message_id", "=", "m.id")
            .onRef("rr.user_uuid", "=", "es.user_uuid"),
        )
        .select([
          "es.event_uuid as eventUuid",
          "e.event_name as eventName",
          sql<string>`max(m.created_at)`.as("latestMessageAt"),
        ])
        .where("es.user_uuid", "=", safeUuid)
        .where("e.deleted", "=", 0)
        .where("m.user_uuid", "!=", safeUuid)
        .where("rr.id", "is", null)
        .groupBy(["es.event_uuid", "e.event_name"])
        .compile(),
    [safeUuid],
  );

  const { data } = useTypedQuery(compiled, expect<UnreadChatRow>());

  const notifications = useMemo<EventChatNotification[]>(() => {
    const items = (data ?? [])
      .filter((row) => row.eventUuid && row.latestMessageAt)
      .map((row) => ({
        eventUuid: row.eventUuid as string,
        eventName: row.eventName?.trim() || "Untitled event",
        latestMessageAt: row.latestMessageAt,
        hasUnreadMention: false,
      }));

    // @mention chats first (future), then most recent activity.
    return items.sort((a, b) => {
      if (a.hasUnreadMention !== b.hasUnreadMention) {
        return a.hasUnreadMention ? -1 : 1;
      }
      return b.latestMessageAt.localeCompare(a.latestMessageAt);
    });
  }, [data]);

  const unreadChatCount = notifications.length;

  return { notifications, unreadChatCount };
}
