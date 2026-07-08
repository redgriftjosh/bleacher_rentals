"use client";

import { Copy, Eye, Pencil, Reply } from "lucide-react";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type Props = {
  children: React.ReactNode;
  messageBody: string;
  /** Only the author can edit their message. */
  isOwnMessage: boolean;
};

/**
 * Right-click menu on a chat message bubble.
 */
export function EventMessageContextMenu({ children, messageBody, isOwnMessage }: Props) {
  const handleCopy = async () => {
    const text = messageBody.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      createSuccessToast(["Message copied to clipboard."]);
    } catch {
      createErrorToast(["Failed to copy message."]);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => void handleCopy()}>
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
