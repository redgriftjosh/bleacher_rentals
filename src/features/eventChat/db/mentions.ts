import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";

/** Persist @mention targets for one message (idempotent per user). */
export async function insertEventMessageMentions(
  messageId: string,
  mentionedUserUuids: string[],
): Promise<void> {
  const unique = [...new Set(mentionedUserUuids.filter(Boolean))];
  if (unique.length === 0) return;

  const existing = await typedGetAll(
    db
      .selectFrom("EventMessageMentions")
      .select(["mentioned_user_uuid"])
      .where("message_id", "=", messageId)
      .where("mentioned_user_uuid", "in", unique)
      .compile(),
    expect<{ mentioned_user_uuid: string | null }>(),
  );
  const existingSet = new Set(existing.map((r) => r.mentioned_user_uuid));

  const now = new Date().toISOString();
  for (const mentionedUserUuid of unique) {
    if (existingSet.has(mentionedUserUuid)) continue;

    await typedExecute(
      db
        .insertInto("EventMessageMentions")
        .values({
          id: crypto.randomUUID(),
          message_id: messageId,
          mentioned_user_uuid: mentionedUserUuid,
          created_at: now,
        })
        .compile(),
    );
  }
}
