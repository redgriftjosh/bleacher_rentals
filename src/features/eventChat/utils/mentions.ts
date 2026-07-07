import {
  chatUserDisplayName,
  type ChatEligibleUser,
} from "../hooks/useChatEligibleUsers";

/** Active @mention being typed at the cursor (Slack-style). */
export type ActiveMention = {
  /** Characters typed after @ up to the cursor (may be empty). */
  query: string;
  /** Index of the @ character in the message body. */
  atIndex: number;
};

/**
 * Returns the in-progress @mention at `cursor`, or null when not in mention mode.
 * Mention ends at whitespace; @ must be at start or after whitespace.
 */
export function getActiveMention(text: string, cursor: number): ActiveMention | null {
  if (cursor < 0 || cursor > text.length) return null;

  let atIndex = -1;
  for (let i = cursor - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "@") {
      atIndex = i;
      break;
    }
    if (/\s/.test(ch)) return null;
  }

  if (atIndex === -1) return null;
  if (atIndex > 0 && !/\s/.test(text[atIndex - 1]!)) return null;

  const query = text.slice(atIndex + 1, cursor);
  if (query.length > 0 && !/^[a-zA-Z0-9._'-]*$/u.test(query)) return null;

  return { query, atIndex };
}

/** Case-insensitive filter — narrows the list as the user types after @. */
export function filterUsersForMention(
  users: ChatEligibleUser[],
  query: string,
): ChatEligibleUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;

  return users.filter((user) => {
    const display = chatUserDisplayName(user).toLowerCase();
    const first = (user.firstName ?? "").toLowerCase();
    const last = (user.lastName ?? "").toLowerCase();
    const email = (user.email ?? "").toLowerCase();
    const compactName = `${first}${last}`;

    return (
      display.includes(q) ||
      first.startsWith(q) ||
      last.startsWith(q) ||
      compactName.includes(q.replace(/\s+/g, "")) ||
      email.startsWith(q)
    );
  });
}

/** Replace the partial @query with a completed @DisplayName mention. */
export function insertMentionIntoText(
  text: string,
  mention: ActiveMention,
  cursor: number,
  displayName: string,
): { text: string; cursor: number } {
  const before = text.slice(0, mention.atIndex);
  const after = text.slice(cursor);
  const mentionText = `@${displayName} `;
  const nextText = before + mentionText + after;
  return { text: nextText, cursor: before.length + mentionText.length };
}
