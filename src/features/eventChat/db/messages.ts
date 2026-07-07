import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { insertEventMessageMentions } from "./mentions";

/** Payload for inserting a new row into EventMessages. */
export type SendEventMessageInput = {
  eventUuid: string;
  userUuid: string;
  body: string;
  /** System messages (e.g. "X joined") — rendered differently in the UI. */
  isSystem?: boolean;
  /** Users @mentioned in this message (stored in EventMessageMentions). */
  mentionedUserUuids?: string[];
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

  const mentionTargets = (input.mentionedUserUuids ?? []).filter(
    (uuid) => uuid && uuid !== input.userUuid,
  );
  if (mentionTargets.length > 0) {
    await insertEventMessageMentions(id, mentionTargets);
  }

  return id;
}
