"use client";

import { CircleDot, LogOut, Users } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type Props = {
  children: React.ReactNode;
  canManageMembers: boolean;
  onLeaveChat: () => void;
  onChatMembers: () => void;
  onMarkUnread: () => void;
};

/** Right-click menu on a conversation row in /messages/internal sidebar. */
export function EventChatConversationContextMenu({
  children,
  canManageMembers,
  onLeaveChat,
  onChatMembers,
  onMarkUnread,
}: Props) {
  const defer = (action: () => void) => {
    window.setTimeout(action, 0);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => defer(onLeaveChat)}>
          <LogOut />
          Leave chat
        </ContextMenuItem>
        {canManageMembers && (
          <ContextMenuItem onSelect={() => defer(onChatMembers)}>
            <Users />
            Chat members
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => defer(onMarkUnread)}>
          <CircleDot />
          Mark unread
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
