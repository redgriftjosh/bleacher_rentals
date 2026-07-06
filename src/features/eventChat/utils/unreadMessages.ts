import type { EventMessage } from "../hooks/useEventMessages";
import type { EventReadReceiptMap } from "../hooks/useReadReceipts";

/**
 * How read state works:
 *
 * - Each row in EventMessages has a unique `id` (uuid).
 * - When someone reads a message, we insert EventMessageReadReceipts:
 *     { message_id: <EventMessages.id>, user_uuid: <reader> }
 * - receiptsByMessage is a Map built from those rows:
 *     message_id → [user_uuid, user_uuid, ...]
 *
 * So for a message `msg`, receiptsByMessage.get(msg.id) returns who read it.
 * If our userUuid is NOT in that list → this message is unread for us.
 */
export function findFirstUnreadMessageId(
  messages: EventMessage[],
  userUuid: string | null,
  receiptsByMessage: EventReadReceiptMap,
): string | null {
  if (!userUuid) return null;

  for (const msg of messages) {
    if (msg.is_system || msg.user_uuid === userUuid) continue;

    const readers = receiptsByMessage.get(msg.id) ?? [];
    if (!readers.includes(userUuid)) return msg.id;
  }

  return null;
}

/** True when there is at least one message before the unread anchor (for the divider line). */
export function hasMessagesAbove(messages: EventMessage[], messageId: string): boolean {
  const index = messages.findIndex((m) => m.id === messageId);
  return index > 0;
}

/** Frozen once on chat open — divider only when unread starts after prior thread history. */
export function shouldShowNewMessagesDivider(
  messages: EventMessage[],
  firstUnreadId: string | null,
): boolean {
  if (!firstUnreadId) return false;
  return hasMessagesAbove(messages, firstUnreadId);
}

/** Scroll the chat container so `target` sits near the top (Telegram-style). */
export function scrollContainerToElement(
  container: HTMLElement,
  target: HTMLElement,
  offsetPx = 8,
) {
  const top =
    target.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop -
    offsetPx;
  container.scrollTop = Math.max(0, top);
}
