"use client";

import { CircleDot, LogOut, MoreVertical, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  canManageMembers: boolean;
  onChatMembers: () => void;
  onLeaveChat?: () => void;
  onMarkUnread?: () => void;
};

/**
 * Chat header menu — same item style as message context menu (PKM).
 */
export function EventChatMenuDropdown({
  canManageMembers,
  onChatMembers,
  onLeaveChat,
  onMarkUnread,
}: Props) {
  const handleChatMembers = () => {
    window.setTimeout(() => onChatMembers(), 0);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="p-2 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer flex-shrink-0"
          title="Chat menu"
          aria-label="Chat menu"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onLeaveChat?.()}>
          <LogOut />
          Leave chat
        </DropdownMenuItem>
        {canManageMembers && (
          <DropdownMenuItem onSelect={handleChatMembers}>
            <Users />
            Chat members
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onMarkUnread?.()}>
          <CircleDot />
          Mark unread
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
