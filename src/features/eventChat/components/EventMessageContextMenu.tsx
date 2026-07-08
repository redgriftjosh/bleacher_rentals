"use client";

import { Copy, Eye, Pencil, Reply } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type Props = {
  children: React.ReactNode;
  /** Only the author can edit their message. */
  isOwnMessage: boolean;
};

/**
 * Right-click menu on a chat message bubble.
 * Actions are wired up in follow-up tasks — this step only opens the menu.
 */
export function EventMessageContextMenu({ children, isOwnMessage }: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={(e) => e.preventDefault()}>
          <Copy />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onSelect={(e) => e.preventDefault()}>
          <Reply />
          Reply
        </ContextMenuItem>
        {isOwnMessage && (
          <ContextMenuItem onSelect={(e) => e.preventDefault()}>
            <Pencil />
            Edit
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={(e) => e.preventDefault()}>
          <Eye />
          View read receipts
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
