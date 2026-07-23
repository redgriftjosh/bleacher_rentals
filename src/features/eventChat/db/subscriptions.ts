import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";

/**
 * Adds a user to an event chat (idempotent — safe if already subscribed).
 * Returns the subscription row id.
 */
export async function subscribeToEvent(eventUuid: string, userUuid: string): Promise<string> {
  const existing = await typedGetAll(
    db
      .selectFrom("EventSubscriptions")
      .select(["id"])
      .where("event_uuid", "=", eventUuid)
      .where("user_uuid", "=", userUuid)
      .limit(1)
      .compile(),
    expect<{ id: string }>(),
  );
  if (existing.length > 0) return existing[0].id;

  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("EventSubscriptions")
      .values({
        id,
        event_uuid: eventUuid,
        user_uuid: userUuid,
        created_at: new Date().toISOString(),
        unread: 0,
      })
      .compile(),
  );

  // TODO: notify only the added user — "You were added to the chat" (in-app badge / email TBD).

  return id;
}

/** Removes a user from an event chat so they can read but not write or manage members. */
export async function unsubscribeFromEvent(eventUuid: string, userUuid: string) {
  await typedExecute(
    db
      .deleteFrom("EventSubscriptions")
      .where("event_uuid", "=", eventUuid)
      .where("user_uuid", "=", userUuid)
      .compile(),
  );
}

/** Marks the conversation unread for this user (does not clear read receipts). */
export async function markEventChatUnread(eventUuid: string, userUuid: string) {
  await typedExecute(
    db
      .updateTable("EventSubscriptions")
      .set({ unread: 1 })
      .where("event_uuid", "=", eventUuid)
      .where("user_uuid", "=", userUuid)
      .compile(),
  );
}

/** Clears the conversation unread flag (e.g. when the user reads the chat). */
export async function clearEventChatUnread(eventUuid: string, userUuid: string) {
  await typedExecute(
    db
      .updateTable("EventSubscriptions")
      .set({ unread: 0 })
      .where("event_uuid", "=", eventUuid)
      .where("user_uuid", "=", userUuid)
      .compile(),
  );
}
