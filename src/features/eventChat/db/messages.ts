import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

export type SendEventMessageInput = {
  eventUuid: string;
  userUuid: string;
  body: string;
  isSystem?: boolean;
};

export async function sendEventMessage(input: SendEventMessageInput): Promise<string> {
  const id = crypto.randomUUID();
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
