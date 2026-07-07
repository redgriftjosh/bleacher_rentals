"use client";

import { useLayoutEffect, useRef } from "react";
import { chatUserDisplayName, chatUserInitials, type ChatEligibleUser } from "../hooks/useChatEligibleUsers";

type Props = {
  users: ChatEligibleUser[];
  highlightIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (user: ChatEligibleUser) => void;
};

/** Slack-style dropdown above the composer when typing @. */
export function MentionAutocomplete({ users, highlightIndex, onHighlight, onSelect }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  // Keep keyboard-highlighted option visible inside the scrollable list.
  useLayoutEffect(() => {
    const item = itemRefs.current[highlightIndex];
    const list = listRef.current;
    if (!item || !list) return;

    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const visibleTop = list.scrollTop;
    const visibleBottom = visibleTop + list.clientHeight;

    if (itemTop < visibleTop) {
      list.scrollTop = itemTop;
    } else if (itemBottom > visibleBottom) {
      list.scrollTop = itemBottom - list.clientHeight;
    }
  }, [highlightIndex, users]);

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Mention a team member"
      aria-activedescendant={users[highlightIndex] ? `mention-option-${users[highlightIndex].userUuid}` : undefined}
      className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg z-20 py-1"
    >
      {users.map((user, index) => {
        const highlighted = index === highlightIndex;

        return (
          <li
            key={user.userUuid}
            id={`mention-option-${user.userUuid}`}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="option"
            aria-selected={highlighted}
          >
            <button
              type="button"
              onMouseDown={(e) => {
                // Keep focus on the textarea until after selection is applied.
                e.preventDefault();
                onSelect(user);
              }}
              onMouseEnter={() => onHighlight(index)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer ${
                highlighted ? "bg-sky-50 text-gray-900" : "text-gray-800 hover:bg-gray-50"
              }`}
            >
              <div className="size-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-700 flex-shrink-0">
                {chatUserInitials(user)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{chatUserDisplayName(user)}</p>
                {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
              </div>
              {user.isAdmin && (
                <span className="text-[10px] uppercase text-gray-400 flex-shrink-0">Admin</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
