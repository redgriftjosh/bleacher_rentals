"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import type { EventChatConversation } from "../hooks/useEventChatConversations";
import { EventChatConversationContextMenu } from "./EventChatConversationContextMenu";

type Props = {
  conversation: EventChatConversation;
  isActive: boolean;
  canManageMembers: boolean;
  actionsDisabled?: boolean;
  onLeaveChat: () => void;
  onChatMembers: () => void;
  onMarkUnread: () => void;
};

export function EventChatConversationListItem({
  conversation,
  isActive,
  canManageMembers,
  actionsDisabled = false,
  onLeaveChat,
  onChatMembers,
  onMarkUnread,
}: Props) {
  const timeLabel = DateTime.fromISO(conversation.latestMessageAt).toRelative() ?? "";

  return (
    <EventChatConversationContextMenu
      canManageMembers={canManageMembers}
      onLeaveChat={actionsDisabled ? () => {} : onLeaveChat}
      onChatMembers={actionsDisabled ? () => {} : onChatMembers}
      onMarkUnread={actionsDisabled ? () => {} : onMarkUnread}
    >
      <Link
        href={`/messages/internal/${conversation.eventUuid}`}
        className={[
          "block px-4 py-3 border-b border-gray-100 transition cursor-pointer",
          isActive
            ? "bg-blue-50 border-l-2 border-l-blue-500"
            : conversation.hasUnreadMention
              ? "bg-amber-50 hover:bg-amber-100 border-l-2 border-l-amber-400"
              : conversation.hasUnread
                ? "bg-gray-50 hover:bg-gray-100 border-l-2 border-l-blue-300"
                : "hover:bg-gray-50 border-l-2 border-l-transparent",
        ].join(" ")}
      >
        <p
          className={`text-sm truncate ${
            conversation.hasUnread || conversation.hasUnreadMention
              ? "font-semibold text-gray-900"
              : "font-medium text-gray-800"
          }`}
        >
          {conversation.eventName}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {conversation.hasUnreadMention ? (
            <span className="text-amber-700 font-medium">Mention · </span>
          ) : conversation.hasUnread ? (
            <span className="text-blue-600 font-medium">Unread · </span>
          ) : null}
          {timeLabel || "Active chat"}
        </p>
      </Link>
    </EventChatConversationContextMenu>
  );
}
