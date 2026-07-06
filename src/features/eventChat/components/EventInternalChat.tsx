"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Send } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import {
  displayName,
  initials,
  useRoadmapUsers,
} from "@/app/roadmap/_lib/hooks/useRoadmapUsers";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { sendEventMessage } from "../db/messages";
import { markEventMessagesRead } from "../db/readReceipts";
import { useEventMessages } from "../hooks/useEventMessages";
import { useEventReadReceipts } from "../hooks/useReadReceipts";
import { useEventTypingEmitter, useEventTypingIndicators } from "../hooks/useTypingIndicators";

type Props = {
  /** Event (quote) id — each event has its own isolated chat thread. */
  eventUuid: string;
};

/**
 * Team-only internal chat panel for one event.
 * Pattern mirrors Roadmap TaskChat: PowerSync reads/writes, no Zustand/Pusher.
 */
export function EventInternalChat({ eventUuid }: Props) {
  // --- Data hooks (reactive via PowerSync) ---
  const { messages } = useEventMessages(eventUuid);
  const { receiptsByMessage } = useEventReadReceipts(eventUuid);
  const { userMap } = useRoadmapUsers(); // Reused for avatars / display names
  const userUuid = usePermissionsStore((s) => s.userId);
  const { typingUserUuids } = useEventTypingIndicators(eventUuid, userUuid);
  const { emitTyping, stopTyping } = useEventTypingEmitter(eventUuid, userUuid);

  // --- Compose UI state ---
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll when new messages arrive.
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  // Mark all visible messages as read while chat is open (enables read receipts for senders).
  useEffect(() => {
    if (!eventUuid || !userUuid) return;
    void markEventMessagesRead(eventUuid, userUuid);
  }, [eventUuid, userUuid, messages.length]);

  // Resolve typing indicator uuids to human-readable names.
  const typingNames = useMemo(
    () => typingUserUuids.map((uuid) => displayName(userMap.get(uuid))).filter(Boolean),
    [typingUserUuids, userMap],
  );

  const handleSend = useCallback(async () => {
    if (!body.trim() || !userUuid) return;
    setSending(true);
    stopTyping(); // Clear typing indicator before message is sent.
    try {
      await sendEventMessage({
        eventUuid,
        userUuid,
        body: body.trim(),
      });
      setBody("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      createErrorToast(["Send failed", message]);
    } finally {
      setSending(false);
    }
  }, [body, eventUuid, stopTyping, userUuid]);

  // Enter sends; Shift+Enter inserts a newline.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-[520px] min-h-0 border rounded-lg overflow-hidden bg-white">
      {/* Header — clarifies this is internal-only */}
      <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">Internal discussion</h3>
        <p className="text-xs text-gray-500 mt-0.5">Team-only chat for this event. Not visible to clients.</p>
      </div>

      {/* Scrollable message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-8">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg) => {
            // System lines (future: join/leave) — centred, no bubble.
            if (msg.is_system) {
              return (
                <div key={msg.id} className="flex justify-center py-0.5">
                  <span className="text-[11px] text-gray-400 italic">{msg.body}</span>
                </div>
              );
            }

            const isMe = msg.user_uuid === userUuid;
            const user = userMap.get(msg.user_uuid);
            const readers = receiptsByMessage.get(msg.id) ?? [];
            // Exclude sender from "read by" count on their own messages.
            const readByOthers = readers.filter((uuid) => uuid !== msg.user_uuid);

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar initials */}
                <div
                  className="size-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                  style={{ backgroundColor: isMe ? "#4a90d9" : "#6b7280" }}
                >
                  {initials(user)}
                </div>

                <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                  <div
                    className={`flex items-baseline gap-2 mb-0.5 ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-xs font-medium text-gray-700">
                      {isMe ? "You" : displayName(user)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.created_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                      isMe
                        ? "bg-blue-100 text-gray-900 rounded-tr-none"
                        : "bg-gray-100 text-gray-900 rounded-tl-none"
                    }`}
                  >
                    {msg.body}
                  </div>
                  {/* Read receipt — only shown on messages you sent */}
                  {isMe && (
                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                      {readByOthers.length > 0 ? (
                        <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                          <CheckCheck className="size-3" />
                          Read by {readByOthers.length}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Check className="size-3" />
                          Sent
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator — shown below messages, above scroll anchor */}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 italic">
            <div className="flex gap-0.5">
              <span
                className="animate-bounce size-1.5 rounded-full bg-gray-400"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="animate-bounce size-1.5 rounded-full bg-gray-400"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="animate-bounce size-1.5 rounded-full bg-gray-400"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="flex gap-2 p-4 border-t bg-white flex-shrink-0">
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            emitTyping(); // Broadcast typing state to other participants.
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="flex-1 px-3 py-2 border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-greenAccent"
        />
        <PrimaryButton onClick={() => void handleSend()} loading={sending} disabled={!body.trim()}>
          <Send className="size-4" />
        </PrimaryButton>
      </div>
    </div>
  );
}
