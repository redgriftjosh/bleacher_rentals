import { sendEventMessage } from "./messages";
import { markEventChatUnread, unsubscribeFromEvent } from "./subscriptions";

export { clearEventChatUnread, markEventChatUnread } from "./subscriptions";

/** Unsubscribe the current user and post a system leave message. */
export async function leaveEventChat(
  eventUuid: string,
  userUuid: string,
  actorName: string,
) {
  await unsubscribeFromEvent(eventUuid, userUuid);
  await sendEventMessage({
    eventUuid,
    userUuid,
    body: `${actorName} left the chat.`,
    isSystem: true,
  });
}

/** Sets the subscription unread flag (reusable from chat menu or sidebar PKM). */
export async function markEventConversationUnread(eventUuid: string, userUuid: string) {
  await markEventChatUnread(eventUuid, userUuid);
}
