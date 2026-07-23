import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { insertEventMessageMentions, replaceEventMessageMentions } from "./mentions";

/** Payload for inserting a new row into EventMessages. */
export type SendEventMessageInput = {
  eventUuid: string;
  userUuid: string;
  body: string;
  /** System messages (e.g. "X joined") — rendered differently in the UI. */
  isSystem?: boolean;
  /** Users @mentioned in this message (stored in EventMessageMentions). */
  mentionedUserUuids?: string[];
  /** Parent message when this is a reply. */
  replyToMessageId?: string | null;
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
        reply_to_message_id: input.replyToMessageId ?? null,
        created_at: new Date().toISOString(),
      })
      .compile(),
  );

  const mentionTargets = (input.mentionedUserUuids ?? []).filter(
    (uuid) => uuid && uuid !== input.userUuid,
  );
  if (mentionTargets.length > 0) {
    await insertEventMessageMentions(id, mentionTargets);
  }

  return id;
}

export type UpdateEventMessageInput = {
  messageId: string;
  body: string;
  mentionedUserUuids?: string[];
};

/** Updates message body and sets edited_at. Replaces @mentions when provided. */
export async function updateEventMessage(input: UpdateEventMessageInput): Promise<void> {
  await typedExecute(
    db
      .updateTable("EventMessages")
      .set({
        body: input.body,
        edited_at: new Date().toISOString(),
      })
      .where("id", "=", input.messageId)
      .compile(),
  );

  if (input.mentionedUserUuids !== undefined) {
    await replaceEventMessageMentions(input.messageId, input.mentionedUserUuids);
  }
}
