"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Users } from "lucide-react";
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
import { useEventChatMemberAccess } from "../hooks/useEventChatMemberAccess";
import { useMentionableChatMembers } from "../hooks/useMentionableChatMembers";
import { useEventMessageMentions } from "../hooks/useEventMessageMentions";
import { parseMentionedUserIds } from "../utils/mentions";
import {
  countUnreadMessages,
  findFirstUnreadMessageId,
  isContainerNearBottom,
  scrollContainerToBottom,
  scrollContainerToElement,
  shouldShowNewMessagesDivider,
} from "../utils/unreadMessages";
import { EventChatMembersModal } from "./EventChatMembersModal";
import { EventChatComposer } from "./EventChatComposer";
import { EventMessageBody } from "./EventMessageBody";
import { NewMessagesDivider } from "./NewMessagesDivider";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

type Props = {
  eventUuid: string;
};

export function EventInternalChat({ eventUuid }: Props) {
  const { messages, isLoading: messagesLoading } = useEventMessages(eventUuid);
  const { receiptsByMessage, isLoading: receiptsLoading } = useEventReadReceipts(eventUuid);
  const { userMap } = useRoadmapUsers();
  const userUuid = usePermissionsStore((s) => s.userId);
  const { canManageMembers, canWrite } = useEventChatMemberAccess(eventUuid);
  const { members: mentionableMembers } = useMentionableChatMembers(eventUuid, userUuid);
  const { mentionsByMessage } = useEventMessageMentions(eventUuid);
  const { typingUserUuids } = useEventTypingIndicators(eventUuid, userUuid);
  const { emitTyping, stopTyping } = useEventTypingEmitter(eventUuid, userUuid);

  const [membersOpen, setMembersOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const markReadScheduledRef = useRef(false);
  const initialMessageCountRef = useRef<number | null>(null);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const wasNearBottomRef = useRef(true);

  // Frozen on open — keeps divider visible for this session even after mark-as-read.
  const [openUnreadUi, setOpenUnreadUi] = useState<{
    anchorId: string | null;
    showDivider: boolean;
  } | null>(null);

  useEffect(() => {
    setOpenUnreadUi(null);
    initialScrollDoneRef.current = false;
    setInitialScrollDone(false);
    markReadScheduledRef.current = false;
    initialMessageCountRef.current = null;
    prevCountRef.current = 0;
    setIsNearBottom(true);
    wasNearBottomRef.current = true;
  }, [eventUuid]);

  const unreadCount = useMemo(
    () => countUnreadMessages(messages, userUuid, receiptsByMessage),
    [messages, receiptsByMessage, userUuid],
  );

  const showScrollToBottomButton = initialScrollDone && !isNearBottom;

  const unreadAnchorId = openUnreadUi?.anchorId ?? null;
  const showDividerBefore = openUnreadUi?.showDivider ?? false;

  const scrollToInitialPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;

    if (unreadAnchorId) {
      const divider = container.querySelector<HTMLElement>("[data-new-messages-divider]");
      if (divider) {
        scrollContainerToElement(container, divider);
        return true;
      }

      const messageEl = container.querySelector<HTMLElement>(`#event-msg-${unreadAnchorId}`);
      if (messageEl) {
        scrollContainerToElement(container, messageEl);
        return true;
      }
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "instant" });
    return true;
  }, [unreadAnchorId]);

  // Pass 1: snapshot unread anchor after queries settle. Pass 2: scroll once divider is in DOM.
  useLayoutEffect(() => {
    if (initialScrollDoneRef.current) return;
    if (messagesLoading || receiptsLoading || !userUuid || messages.length === 0) return;

    if (openUnreadUi === null) {
      const anchorId = findFirstUnreadMessageId(messages, userUuid, receiptsByMessage);
      setOpenUnreadUi({
        anchorId,
        showDivider: shouldShowNewMessagesDivider(messages, anchorId),
      });
      return;
    }

    const runScroll = () => {
      if (initialScrollDoneRef.current) return;
      if (!scrollToInitialPosition()) return;

      initialScrollDoneRef.current = true;
      setInitialScrollDone(true);

      if (!markReadScheduledRef.current) {
        markReadScheduledRef.current = true;
        initialMessageCountRef.current = messages.length;
        window.setTimeout(() => {
          if (eventUuid && userUuid) void markEventMessagesRead(eventUuid, userUuid);
        }, 400);
      }
    };

    runScroll();
    const retry = window.setTimeout(runScroll, 100);
    return () => window.clearTimeout(retry);
  }, [
    eventUuid,
    messages,
    messages.length,
    messagesLoading,
    openUnreadUi,
    receiptsByMessage,
    receiptsLoading,
    scrollToInitialPosition,
    userUuid,
    unreadAnchorId,
  ]);

  // Track scroll position — auto-scroll only when pinned to bottom.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateNearBottom = () => {
      const near = isContainerNearBottom(container);
      const becameNearBottom = near && !wasNearBottomRef.current;
      wasNearBottomRef.current = near;
      setIsNearBottom(near);

      if (becameNearBottom && initialScrollDoneRef.current && eventUuid && userUuid) {
        void markEventMessagesRead(eventUuid, userUuid);
      }
    };

    updateNearBottom();
    container.addEventListener("scroll", updateNearBottom, { passive: true });
    return () => container.removeEventListener("scroll", updateNearBottom);
  }, [eventUuid, messages.length, openUnreadUi, userUuid]);

  const handleScrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    scrollContainerToBottom(container);
    setIsNearBottom(true);
    if (eventUuid && userUuid) void markEventMessagesRead(eventUuid, userUuid);
  }, [eventUuid, userUuid]);

  // New messages: auto-scroll + mark read only when already at the bottom.
  useEffect(() => {
    if (!initialScrollDoneRef.current) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    if (messages.length > prevCountRef.current && isNearBottom) {
      scrollContainerToBottom(container);
      if (eventUuid && userUuid) void markEventMessagesRead(eventUuid, userUuid);
    }

    prevCountRef.current = messages.length;
  }, [eventUuid, isNearBottom, messages.length, userUuid]);

  const typingNames = typingUserUuids
    .map((uuid) => displayName(userMap.get(uuid)))
    .filter(Boolean);

  const handleSend = useCallback(async () => {
    if (!body.trim() || !userUuid || !canWrite) return;
    setSending(true);
    stopTyping();
    try {
      const trimmedBody = body.trim();
      const mentionedUserUuids = parseMentionedUserIds(trimmedBody, mentionableMembers);
      await sendEventMessage({
        eventUuid,
        userUuid,
        body: trimmedBody,
        mentionedUserUuids,
      });
      setBody("");
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (container) scrollContainerToBottom(container);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      createErrorToast(["Send failed", message]);
    } finally {
      setSending(false);
    }
  }, [body, canWrite, eventUuid, mentionableMembers, stopTyping, userUuid]);

  return (
    <div className="flex flex-col h-[520px] min-h-0 border rounded-lg overflow-hidden bg-white">
      <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Internal discussion</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Team-only chat for this event. Not visible to clients.
          </p>
        </div>
        {canManageMembers && (
          <button
            type="button"
            onClick={() => setMembersOpen(true)}
            className="p-2 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer flex-shrink-0"
            title="Manage chat members"
          >
            <Users className="size-4" />
          </button>
        )}
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-8">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg) => {
            const isUnreadAnchor = msg.id === unreadAnchorId;
            const showDivider = isUnreadAnchor && showDividerBefore;

            if (msg.is_system) {
              return (
                <div key={msg.id}>
                  {showDivider && <NewMessagesDivider />}
                  <div className="flex justify-center py-0.5">
                    <span className="text-[11px] text-gray-400 italic">{msg.body}</span>
                  </div>
                </div>
              );
            }

            const isMe = msg.user_uuid === userUuid;
            const user = userMap.get(msg.user_uuid);
            const readers = receiptsByMessage.get(msg.id) ?? [];
            const readByOthers = readers.filter((uuid) => uuid !== msg.user_uuid);
            const mentionsMe =
              Boolean(userUuid) && (mentionsByMessage.get(msg.id)?.includes(userUuid!) ?? false);
            const iHaveRead = Boolean(userUuid && readers.includes(userUuid));
            const showMentionHighlight = mentionsMe && !isMe && !iHaveRead;

            return (
              <div key={msg.id} id={`event-msg-${msg.id}`}>
                {showDivider && <NewMessagesDivider />}
                <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
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
                          : showMentionHighlight
                            ? "bg-amber-50 text-gray-900 rounded-tl-none ring-2 ring-amber-300"
                            : "bg-gray-100 text-gray-900 rounded-tl-none"
                      }`}
                    >
                      <EventMessageBody
                        body={msg.body}
                        members={mentionableMembers}
                        currentUserUuid={userUuid}
                      />
                    </div>
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
              </div>
            );
          })
        )}

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

        {showScrollToBottomButton && (
          <ScrollToBottomButton unreadCount={unreadCount} onClick={handleScrollToBottom} />
        )}
      </div>

      {canWrite ? (
        <EventChatComposer
          eventUuid={eventUuid}
          userUuid={userUuid}
          value={body}
          onChange={setBody}
          onSend={() => void handleSend()}
          onTyping={emitTyping}
          sending={sending}
        />
      ) : (
        <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-500 text-center flex-shrink-0">
          You can read this chat but cannot send messages. Ask an admin or a member to add you.
        </div>
      )}

      {canManageMembers && (
        <EventChatMembersModal
          eventUuid={eventUuid}
          open={membersOpen}
          onOpenChange={setMembersOpen}
        />
      )}
    </div>
  );
}
