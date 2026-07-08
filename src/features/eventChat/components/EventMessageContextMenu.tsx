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
  /** Only the author can edit their message or view read receipts. */
  isOwnMessage: boolean;
  onViewReadReceipts?: () => void;
};

/**
 * Right-click menu on a chat message bubble.
 * Dialogs open via parent callbacks so ContextMenu state is not corrupted.
 */
export function EventMessageContextMenu({
  children,
  messageBody,
  isOwnMessage,
  onViewReadReceipts,
}: Props) {
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

  const handleViewReadReceipts = () => {
    // Defer until ContextMenu has fully closed — avoids Radix focus/pointer trap bugs.
    window.setTimeout(() => onViewReadReceipts?.(), 0);
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
        {isOwnMessage && onViewReadReceipts && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={handleViewReadReceipts}>
              <Eye />
              View read receipts
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
