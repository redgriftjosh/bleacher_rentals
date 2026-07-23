import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";
import { clearEventChatUnread } from "./subscriptions";

/** Prevents overlapping mark-read runs (e.g. scroll retry scheduling twice). */
const markReadInFlight = new Set<string>();

/**
 * Marks all messages in an event chat as read for the current user.
 * Idempotent — safe to call multiple times; skips existing (message_id, user_uuid) pairs.
 * Also clears the subscription-level unread flag.
 */
export async function markEventMessagesRead(eventUuid: string, userUuid: string) {
  const lockKey = `${eventUuid}:${userUuid}`;
  if (markReadInFlight.has(lockKey)) return;
  markReadInFlight.add(lockKey);

  try {
    const messages = await typedGetAll(
      db
        .selectFrom("EventMessages")
        .select(["id"])
        .where("event_uuid", "=", eventUuid)
        .compile(),
      expect<{ id: string }>(),
    );

    if (messages.length === 0) {
      await clearEventChatUnread(eventUuid, userUuid);
      return;
    }

    const messageIds = messages.map((m) => m.id);

    const existing = await typedGetAll(
      db
        .selectFrom("EventMessageReadReceipts")
        .select(["message_id"])
        .where("user_uuid", "=", userUuid)
        .where("message_id", "in", messageIds)
        .compile(),
      expect<{ message_id: string | null }>(),
    );
    const existingSet = new Set(existing.map((r) => r.message_id));

    const now = new Date().toISOString();
    for (const msg of messages) {
      if (existingSet.has(msg.id)) continue;

      // Re-check before insert — another concurrent call may have just written this row.
      const justCreated = await typedGetAll(
        db
          .selectFrom("EventMessageReadReceipts")
          .select(["id"])
          .where("message_id", "=", msg.id)
          .where("user_uuid", "=", userUuid)
          .limit(1)
          .compile(),
        expect<{ id: string }>(),
      );
      if (justCreated.length > 0) {
        existingSet.add(msg.id);
        continue;
      }

      await typedExecute(
        db
          .insertInto("EventMessageReadReceipts")
          .values({
            id: crypto.randomUUID(),
            message_id: msg.id,
            user_uuid: userUuid,
            read_at: now,
          })
          .compile(),
      );
      existingSet.add(msg.id);
    }

    await clearEventChatUnread(eventUuid, userUuid);
  } finally {
    markReadInFlight.delete(lockKey);
  }
}
