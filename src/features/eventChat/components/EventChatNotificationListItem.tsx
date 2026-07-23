"use client";

import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import type { EventChatNotification } from "../hooks/useEventChatNotifications";

type Props = {
  notification: EventChatNotification;
};

/** Single row in the chat notifications popover — opens the event Messages tab. */
export function EventChatNotificationListItem({ notification }: Props) {
  const router = useRouter();

  const timeLabel = DateTime.fromISO(notification.latestMessageAt).toRelative() ?? "";

  const handleClick = () => {
    router.push(`/messages/internal/${notification.eventUuid}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:opacity-90 transition cursor-pointer ${
        notification.hasUnreadMention ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"
      }`}
    >
      <p className="text-sm font-semibold text-gray-900 truncate">{notification.eventName}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        {notification.hasUnreadMention ? (
          <span className="text-amber-700 font-medium">You were mentioned · </span>
        ) : null}
        New messages in internal chat
        {timeLabel ? ` · ${timeLabel}` : ""}
      </p>
    </button>
  );
}
