"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import {
  displayName,
  initials,
  useRoadmapUsers,
} from "@/app/roadmap/_lib/hooks/useRoadmapUsers";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { sendEventMessage } from "../db/messages";
import { useEventMessages } from "../hooks/useEventMessages";

type Props = {
  eventUuid: string;
};

export function EventInternalChat({ eventUuid }: Props) {
  const { messages } = useEventMessages(eventUuid);
  const { userMap } = useRoadmapUsers();
  const userUuid = usePermissionsStore((s) => s.userId);

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!body.trim() || !userUuid) return;
    setSending(true);
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
  }, [body, eventUuid, userUuid]);

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
      <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">Internal discussion</h3>
        <p className="text-xs text-gray-500 mt-0.5">Team-only chat for this event. Not visible to clients.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-8">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg) => {
            if (msg.is_system) {
              return (
                <div key={msg.id} className="flex justify-center py-0.5">
                  <span className="text-[11px] text-gray-400 italic">{msg.body}</span>
                </div>
              );
            }

            const isMe = msg.user_uuid === userUuid;
            const user = userMap.get(msg.user_uuid);

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
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
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-4 border-t bg-white flex-shrink-0">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
