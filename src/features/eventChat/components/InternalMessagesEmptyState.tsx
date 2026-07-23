"use client";

import { MessageSquare } from "lucide-react";

export function InternalMessagesEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-gray-400 px-6">
      <MessageSquare className="size-12 mb-3" strokeWidth={1.5} />
      <p className="text-sm font-medium text-gray-600">Select a conversation</p>
      <p className="text-xs mt-1 text-center max-w-xs">
        Choose an event chat from the sidebar to view and send internal messages.
      </p>
    </div>
  );
}
