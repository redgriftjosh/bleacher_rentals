"use client";

import { MessageSquare } from "lucide-react";
import { useEventChatConversations } from "../hooks/useEventChatConversations";
import { EventChatConversationListItem } from "./EventChatConversationListItem";

type Props = {
  selectedEventUuid: string | null;
};

export function InternalMessagesSidebar({ selectedEventUuid }: Props) {
  const { conversations } = useEventChatConversations();

  return (
    <aside className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col min-h-0 bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Internal chats</h2>
        <p className="text-xs text-gray-500 mt-0.5">Events you are subscribed to</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-gray-400">
            <MessageSquare className="size-8 mb-2" strokeWidth={1.5} />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Join a chat from an event&apos;s Messages tab</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <EventChatConversationListItem
              key={conversation.eventUuid}
              conversation={conversation}
              isActive={selectedEventUuid === conversation.eventUuid}
            />
          ))
        )}
      </div>
    </aside>
  );
}
