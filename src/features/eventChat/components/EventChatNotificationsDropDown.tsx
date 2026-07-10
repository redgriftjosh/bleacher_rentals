"use client";

import { MessageCircle } from "lucide-react";
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
  const hasUnreadMention = unreadMentionCount > 0;
  const badgeLabel = unreadChatCount > 99 ? "99+" : String(unreadChatCount);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center p-1.5 text-white/70 hover:text-white cursor-pointer transition-colors"
          aria-label={
            hasUnread
              ? `Chat notifications, ${unreadChatCount} unread${hasUnreadMention ? `, ${unreadMentionCount} mention${unreadMentionCount === 1 ? "" : "s"}` : ""}`
              : "Chat notifications"
          }
        >
          <MessageCircle
            className={`size-5 ${
              hasUnreadMention
                ? "text-red-400"
                : hasUnread
                  ? "text-yellow-400"
                  : ""
            }`}
          />
          {hasUnread && (
            <span
              className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold leading-none ${
                hasUnreadMention
                  ? "bg-red-500 text-white"
                  : "bg-yellow-400 text-yellow-950"
              }`}
            >
              {badgeLabel}
            </span>
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
              <span className={hasUnreadMention ? "text-red-500" : "text-yellow-600"}>
                ({unreadChatCount}
                {hasUnreadMention
                  ? ` · ${unreadMentionCount} mention${unreadMentionCount === 1 ? "" : "s"}`
                  : ""})
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
