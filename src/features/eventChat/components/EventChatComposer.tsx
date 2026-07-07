"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useMentionableChatMembers } from "../hooks/useMentionableChatMembers";
import { chatUserDisplayName, type ChatEligibleUser } from "../hooks/useChatEligibleUsers";
import {
  filterUsersForMention,
  getActiveMention,
  insertMentionIntoText,
  type ActiveMention,
} from "../utils/mentions";
import { MentionAutocomplete } from "./MentionAutocomplete";

type Props = {
  eventUuid: string;
  userUuid: string | null;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onTyping: () => void;
  sending: boolean;
  disabled?: boolean;
};

export function EventChatComposer({
  eventUuid,
  userUuid,
  value,
  onChange,
  onSend,
  onTyping,
  sending,
  disabled = false,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { members } = useMentionableChatMembers(eventUuid, userUuid);

  const [cursor, setCursor] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const activeMention = useMemo(
    () => getActiveMention(value, cursor),
    [value, cursor],
  );

  const mentionCandidates = useMemo(() => {
    if (!activeMention || members.length === 0) return [];
    return filterUsersForMention(members, activeMention.query);
  }, [activeMention, members]);

  const mentionOpen = Boolean(activeMention && mentionCandidates.length > 0);

  useEffect(() => {
    setHighlightIndex(0);
  }, [activeMention?.query, mentionCandidates.length]);

  const syncCursor = useCallback(() => {
    const el = textareaRef.current;
    if (el) setCursor(el.selectionStart ?? 0);
  }, []);

  const applyMention = useCallback(
    (user: ChatEligibleUser, mention: ActiveMention) => {
      const { text, cursor: nextCursor } = insertMentionIntoText(
        value,
        mention,
        cursor,
        chatUserDisplayName(user),
      );
      onChange(text);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
        setCursor(nextCursor);
      });
    },
    [cursor, onChange, value],
  );

  const selectHighlightedMention = useCallback(() => {
    if (!activeMention || mentionCandidates.length === 0) return false;
    const user = mentionCandidates[highlightIndex] ?? mentionCandidates[0];
    if (!user) return false;
    applyMention(user, activeMention);
    return true;
  }, [activeMention, applyMention, highlightIndex, mentionCandidates]);

  const handleChange = (next: string) => {
    onChange(next);
    onTyping();
    requestAnimationFrame(syncCursor);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectHighlightedMention();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex gap-2 p-4 border-t bg-white flex-shrink-0">
      <div className="relative flex-1 min-w-0">
        {mentionOpen && (
          <MentionAutocomplete
            users={mentionCandidates}
            highlightIndex={highlightIndex}
            onHighlight={setHighlightIndex}
            onSelect={(user) => {
              if (activeMention) applyMention(user, activeMention);
            }}
          />
        )}

        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled || sending}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={syncCursor}
          onClick={syncCursor}
          onSelect={syncCursor}
          placeholder="Type a message… (@ to mention, Enter to send, Shift+Enter for new line)"
          rows={2}
          className="w-full px-3 py-2 border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-greenAccent"
        />
      </div>

      <PrimaryButton
        onClick={onSend}
        loading={sending}
        disabled={disabled || !value.trim()}
      >
        <Send className="size-4" />
      </PrimaryButton>
    </div>
  );
}
