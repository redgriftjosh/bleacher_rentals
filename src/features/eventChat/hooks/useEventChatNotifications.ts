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

type UnreadMentionRow = {
  eventUuid: string | null;
};

/** One row per event in the notifications modal (not per message). */
export type EventChatNotification = {
  eventUuid: string;
  eventName: string;
  latestMessageAt: string;
  /** True when an unread message @mentions the current user. */
  hasUnreadMention: boolean;
};

/**
 * Unread internal chat notifications for the current user.
 *
 * Rules:
 * - Only subscribed events (EventSubscriptions) can notify.
 * - One notification per chat, regardless of how many unread messages.
 * - Unread = message from someone else with no read receipt for this user.
 * - hasUnreadMention = separate query on EventMessageMentions (reliable in PowerSync SQL).
 * - Clears reactively when the user opens the chat (markEventMessagesRead).
 */
export function useEventChatNotifications() {
  const userUuid = usePermissionsStore((s) => s.userId);
  const safeUuid = userUuid ?? "__none__";

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
        .select([
          "es.event_uuid as eventUuid",
          "e.event_name as eventName",
          sql<string>`max(m.created_at)`.as("latestMessageAt"),
        ])
        .where("es.user_uuid", "=", safeUuid)
        .where("e.deleted", "=", 0)
        .where((eb) =>
          eb.or([
            eb.and([eb("m.user_uuid", "!=", safeUuid), eb("rr.id", "is", null)]),
            eb("es.unread", "=", 1),
          ]),
        )
        .groupBy(["es.event_uuid", "e.event_name"])
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

  const { data: unreadRows } = useTypedQuery(unreadCompiled, expect<UnreadChatRow>());
  const { data: mentionRows } = useTypedQuery(mentionCompiled, expect<UnreadMentionRow>());

  const unreadMentionEventIds = useMemo(
    () =>
      new Set(
        (mentionRows ?? [])
          .map((row) => row.eventUuid)
          .filter((id): id is string => Boolean(id)),
      ),
    [mentionRows],
  );

  const notifications = useMemo<EventChatNotification[]>(() => {
    const items = (unreadRows ?? [])
      .filter((row) => row.eventUuid && row.latestMessageAt)
      .map((row) => ({
        eventUuid: row.eventUuid as string,
        eventName: row.eventName?.trim() || "Untitled event",
        latestMessageAt: row.latestMessageAt,
        hasUnreadMention: unreadMentionEventIds.has(row.eventUuid as string),
      }));

    // @mention chats first, then most recent activity.
    return items.sort((a, b) => {
      if (a.hasUnreadMention !== b.hasUnreadMention) {
        return a.hasUnreadMention ? -1 : 1;
      }
      return b.latestMessageAt.localeCompare(a.latestMessageAt);
    });
  }, [unreadMentionEventIds, unreadRows]);

  const unreadChatCount = notifications.length;
  const unreadMentionCount = notifications.filter((n) => n.hasUnreadMention).length;

  return { notifications, unreadChatCount, unreadMentionCount };
}
