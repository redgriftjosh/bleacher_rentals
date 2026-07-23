import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";

/**
 * Upserts a typing indicator for the current user on an event chat.
 * Other clients read EventTypingIndicators reactively to show "X is typing…".
 */
export async function setEventTyping(eventUuid: string, userUuid: string, isTyping: boolean) {
  // One row per (event, user) — check if we already have a row to update.
  const compiled = db
    .selectFrom("EventTypingIndicators")
    .select(["id"])
    .where("event_uuid", "=", eventUuid)
    .where("user_uuid", "=", userUuid)
    .limit(1)
    .compile();

  const rows = await typedGetAll(compiled, expect<{ id: string }>());

  if (rows.length > 0) {
    // Existing row: flip is_typing and bump updated_at (used for stale detection).
    await typedExecute(
      db
        .updateTable("EventTypingIndicators")
        .set({
          is_typing: isTyping ? 1 : 0,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", rows[0].id)
        .compile(),
    );
  } else {
    // First keystroke for this user on this event — create the indicator row.
    await typedExecute(
      db
        .insertInto("EventTypingIndicators")
        .values({
          id: crypto.randomUUID(),
          event_uuid: eventUuid,
          user_uuid: userUuid,
          is_typing: isTyping ? 1 : 0,
          updated_at: new Date().toISOString(),
        })
        .compile(),
    );
  }
}
