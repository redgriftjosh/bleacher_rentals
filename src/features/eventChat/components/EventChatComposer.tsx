"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useMentionableChatMembers } from "../hooks/useMentionableChatMembers";
import { type ChatEligibleUser } from "../hooks/useChatEligibleUsers";
import {
  getSelectionOffset,
  renderPlainTextToEditor,
  serializeEditor,
  setSelectionOffset,
} from "../utils/composerEditor";
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
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSyncedValue = useRef(value);
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

  // Sync external value changes (e.g. clear after send) without fighting live typing.
  useEffect(() => {
    if (value === lastSyncedValue.current) return;

    lastSyncedValue.current = value;
    const editor = editorRef.current;
    if (!editor) return;

    renderPlainTextToEditor(editor, value, members);
  }, [value, members]);

  const syncCursor = useCallback(() => {
    const editor = editorRef.current;
    if (editor) setCursor(getSelectionOffset(editor));
  }, []);

  const applyMention = useCallback(
    (user: ChatEligibleUser, mention: ActiveMention) => {
      const editor = editorRef.current;
      if (!editor) return;

      const plain = serializeEditor(editor);
      const selection = getSelectionOffset(editor);
      const { text, cursor: nextCursor } = insertMentionIntoText(
        plain,
        mention,
        selection,
        user,
      );

      renderPlainTextToEditor(editor, text, members);
      lastSyncedValue.current = text;
      onChange(text);

      requestAnimationFrame(() => {
        editor.focus();
        setSelectionOffset(editor, nextCursor);
        setCursor(nextCursor);
      });
    },
    [members, onChange],
  );

  const selectHighlightedMention = useCallback(() => {
    if (!activeMention || mentionCandidates.length === 0) return false;
    const user = mentionCandidates[highlightIndex] ?? mentionCandidates[0];
    if (!user) return false;
    applyMention(user, activeMention);
    return true;
  }, [activeMention, applyMention, highlightIndex, mentionCandidates]);

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const plain = serializeEditor(editor);
    lastSyncedValue.current = plain;
    onChange(plain);
    onTyping();
    setCursor(getSelectionOffset(editor));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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

  const editorDisabled = disabled || sending;

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

        <div className="relative rounded border border-gray-300 focus-within:ring-2 focus-within:ring-greenAccent focus-within:border-transparent">
          <div
            ref={editorRef}
            contentEditable={!editorDisabled}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-disabled={editorDisabled}
            data-placeholder="Type a message… (@ to mention, Enter to send, Shift+Enter for new line)"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={syncCursor}
            onClick={syncCursor}
            onSelect={syncCursor}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text/plain");
              document.execCommand("insertText", false, text);
            }}
            className={[
              "block w-full min-h-[52px] max-h-40 overflow-y-auto px-3 py-2 text-sm leading-5",
              "whitespace-pre-wrap break-words text-gray-900 focus:outline-none",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400",
              editorDisabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          />
        </div>
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
