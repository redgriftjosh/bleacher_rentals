"use client";

import { useMemo } from "react";
import { sql } from "@powersync/kysely-driver";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";

type ConversationRow = {
  eventUuid: string | null;
  eventName: string | null;
  latestMessageAt: string;
};

type UnreadChatRow = {
  eventUuid: string | null;
};

type UnreadMentionRow = {
  eventUuid: string | null;
};

export type EventChatConversation = {
  eventUuid: string;
  eventName: string;
  latestMessageAt: string;
  hasUnread: boolean;
  hasUnreadMention: boolean;
};

/**
 * Subscribed event chats with at least one message — for /messages/internal sidebar.
 * Sorted: unread @mentions → other unread → read (by latest activity).
 */
export function useEventChatConversations() {
  const userUuid = usePermissionsStore((s) => s.userId);
  const safeUuid = userUuid ?? "__none__";

  const conversationsCompiled = useMemo(
    () =>
      db
        .selectFrom("EventSubscriptions as es")
        .innerJoin("Events as e", "e.id", "es.event_uuid")
        .innerJoin("EventMessages as m", "m.event_uuid", "es.event_uuid")
        .select([
          "es.event_uuid as eventUuid",
          "e.event_name as eventName",
          sql<string>`max(m.created_at)`.as("latestMessageAt"),
        ])
        .where("es.user_uuid", "=", safeUuid)
        .where("e.deleted", "=", 0)
        .groupBy(["es.event_uuid", "e.event_name"])
        .compile(),
    [safeUuid],
  );

  const unreadCompiled = useMemo(
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
        .select(["es.event_uuid as eventUuid"])
        .where("es.user_uuid", "=", safeUuid)
        .where("e.deleted", "=", 0)
        .where((eb) =>
          eb.or([
            eb.and([eb("m.user_uuid", "!=", safeUuid), eb("rr.id", "is", null)]),
            eb("es.unread", "=", 1),
          ]),
        )
        .groupBy("es.event_uuid")
        .compile(),
    [safeUuid],
  );

  const mentionCompiled = useMemo(
    () =>
      db
        .selectFrom("EventMessageMentions as men")
        .innerJoin("EventMessages as m", "m.id", "men.message_id")
        .innerJoin("Events as e", "e.id", "m.event_uuid")
        .innerJoin("EventSubscriptions as es", (join) =>
          join
            .onRef("es.event_uuid", "=", "m.event_uuid")
            .onRef("es.user_uuid", "=", "men.mentioned_user_uuid"),
        )
        .leftJoin("EventMessageReadReceipts as rr", (join) =>
          join
            .onRef("rr.message_id", "=", "m.id")
            .onRef("rr.user_uuid", "=", "men.mentioned_user_uuid"),
        )
        .select(["m.event_uuid as eventUuid"])
        .where("men.mentioned_user_uuid", "=", safeUuid)
        .where("e.deleted", "=", 0)
        .where("m.user_uuid", "!=", safeUuid)
        .where("rr.id", "is", null)
        .groupBy("m.event_uuid")
        .compile(),
    [safeUuid],
  );

  const { data: conversationRows } = useTypedQuery(
    conversationsCompiled,
    expect<ConversationRow>(),
  );
  const { data: unreadRows } = useTypedQuery(unreadCompiled, expect<UnreadChatRow>());
  const { data: mentionRows } = useTypedQuery(mentionCompiled, expect<UnreadMentionRow>());

  const unreadEventIds = useMemo(
    () =>
      new Set(
        (unreadRows ?? [])
          .map((row) => row.eventUuid)
          .filter((id): id is string => Boolean(id)),
      ),
    [unreadRows],
  );

  const unreadMentionEventIds = useMemo(
    () =>
      new Set(
        (mentionRows ?? [])
          .map((row) => row.eventUuid)
          .filter((id): id is string => Boolean(id)),
      ),
    [mentionRows],
  );

  const conversations = useMemo<EventChatConversation[]>(() => {
    const items = (conversationRows ?? [])
      .filter((row) => row.eventUuid && row.latestMessageAt)
      .map((row) => ({
        eventUuid: row.eventUuid as string,
        eventName: row.eventName?.trim() || "Untitled event",
        latestMessageAt: row.latestMessageAt,
        hasUnread: unreadEventIds.has(row.eventUuid as string),
        hasUnreadMention: unreadMentionEventIds.has(row.eventUuid as string),
      }));

    return items.sort((a, b) => {
      if (a.hasUnreadMention !== b.hasUnreadMention) {
        return a.hasUnreadMention ? -1 : 1;
      }
      if (a.hasUnread !== b.hasUnread) {
        return a.hasUnread ? -1 : 1;
      }
      return b.latestMessageAt.localeCompare(a.latestMessageAt);
    });
  }, [conversationRows, unreadEventIds, unreadMentionEventIds]);

  return { conversations };
}
