import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";

/**
 * Marks all messages in an event chat as read for the current user.
 * Called when the chat is open — powers the "Read by N" receipts on sent messages.
 */
export async function markEventMessagesRead(eventUuid: string, userUuid: string) {
  // All message ids for this event.
  const messages = await typedGetAll(
    db
      .selectFrom("EventMessages")
      .select(["id"])
      .where("event_uuid", "=", eventUuid)
      .compile(),
    expect<{ id: string }>(),
  );

  // Receipts this user already has (any event) — skip duplicates.
  const existing = await typedGetAll(
    db
      .selectFrom("EventMessageReadReceipts")
      .select(["message_id"])
      .where("user_uuid", "=", userUuid)
      .compile(),
    expect<{ message_id: string | null }>(),
  );
  const existingSet = new Set(existing.map((r) => r.message_id));

  const now = new Date().toISOString();
  for (const msg of messages) {
    if (existingSet.has(msg.id)) continue;

    // Insert one read receipt per (message, user).
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
  }
}
