"use client";

import { MessageCircle, MessageCircleWarning } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEventChatNotifications } from "../hooks/useEventChatNotifications";
import { EventChatNotificationListItem } from "./EventChatNotificationListItem";

/**
 * Header popover for internal chat notifications.
 * Similar to AlertsDropDown but one entry per chat and no dismissed toggle.
 */
export function EventChatNotificationsDropDown() {
  const { notifications, unreadChatCount, unreadMentionCount } = useEventChatNotifications();
  const hasUnread = unreadChatCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center p-1.5 text-white/70 hover:text-white cursor-pointer transition-colors"
          aria-label="Chat notifications"
        >
          {hasUnread ? (
            <MessageCircleWarning className="size-5" />
          ) : (
            <MessageCircle className="size-5" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 w-[420px] max-h-[480px] overflow-hidden flex flex-col shadow-lg"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-sm font-semibold text-gray-900">
            Chat messages{" "}
            {hasUnread && (
              <span className={unreadMentionCount > 0 ? "text-amber-600" : "text-gray-600"}>
                ({unreadChatCount}
                {unreadMentionCount > 0 ? ` · ${unreadMentionCount} mention${unreadMentionCount === 1 ? "" : "s"}` : ""})
              </span>
            )}
          </span>
        </div>

        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <MessageCircle className="size-8" strokeWidth={1.5} />
              <p className="mt-2 text-sm">No new chat messages</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <EventChatNotificationListItem key={notification.eventUuid} notification={notification} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
