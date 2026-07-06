import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

/** Payload for inserting a new row into EventMessages. */
export type SendEventMessageInput = {
  eventUuid: string;
  userUuid: string;
  body: string;
  /** System messages (e.g. "X joined") — rendered differently in the UI. */
  isSystem?: boolean;
};

/**
 * Writes a chat message to the local PowerSync DB for one event.
 * PowerSync syncs the row to Supabase; other clients pick it up reactively.
 */
export async function sendEventMessage(input: SendEventMessageInput): Promise<string> {
  const id = crypto.randomUUID();

  // Insert into EventMessages — one row per message, scoped by event_uuid.
  await typedExecute(
    db
      .insertInto("EventMessages")
      .values({
        id,
        event_uuid: input.eventUuid,
        user_uuid: input.userUuid,
        body: input.body,
        is_system: input.isSystem ? 1 : 0,
        created_at: new Date().toISOString(),
      })
      .compile(),
  );

  return id;
}
