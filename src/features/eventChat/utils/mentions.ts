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

export type MessageBodyPart =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; userUuid: string; value: string };

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

function membersByNameLength(members: ChatEligibleUser[]): ChatEligibleUser[] {
  return [...members].sort(
    (a, b) => chatUserDisplayName(b).length - chatUserDisplayName(a).length,
  );
}

/** Match @Display Name at a position — longest member name wins. */
function matchMentionAt(
  body: string,
  atIndex: number,
  members: ChatEligibleUser[],
): { user: ChatEligibleUser; endIndex: number } | null {
  if (body[atIndex] !== "@") return null;
  if (atIndex > 0 && !/\s/.test(body[atIndex - 1]!)) return null;

  for (const user of membersByNameLength(members)) {
    const name = chatUserDisplayName(user);
    if (!name) continue;

    const slice = body.slice(atIndex + 1, atIndex + 1 + name.length);
    if (slice.toLowerCase() !== name.toLowerCase()) continue;

    const nextChar = body[atIndex + 1 + name.length];
    if (nextChar !== undefined && !/[\s.,!?;:]/.test(nextChar)) continue;

    return { user, endIndex: atIndex + 1 + name.length };
  }

  return null;
}

/** Parse mention user ids from @Display Name substrings in the body. */
export function parseMentionedUserIds(
  body: string,
  members: ChatEligibleUser[],
): string[] {
  const mentioned = new Set<string>();

  let i = 0;
  while (i < body.length) {
    const hit = matchMentionAt(body, i, members);
    if (!hit) {
      i++;
      continue;
    }
    mentioned.add(hit.user.userUuid);
    i = hit.endIndex;
  }

  return [...mentioned];
}

/** Split message body into plain text + @mention highlights for chat rendering. */
export function splitMessageBody(body: string, members: ChatEligibleUser[] = []): MessageBodyPart[] {
  if (!body) return [{ type: "text", value: "" }];
  if (members.length === 0) return [{ type: "text", value: body }];

  const parts: MessageBodyPart[] = [];
  let textStart = 0;
  let i = 0;

  while (i < body.length) {
    const hit = matchMentionAt(body, i, members);
    if (!hit) {
      i++;
      continue;
    }

    if (i > textStart) {
      parts.push({ type: "text", value: body.slice(textStart, i) });
    }

    parts.push({
      type: "mention",
      name: chatUserDisplayName(hit.user),
      userUuid: hit.user.userUuid,
      value: body.slice(i, hit.endIndex),
    });

    i = hit.endIndex;
    textStart = i;
  }

  if (textStart < body.length) {
    parts.push({ type: "text", value: body.slice(textStart) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: body }];
}

/** Replace partial @query with plain @Display Name (what the user sees while typing). */
export function insertMentionIntoText(
  text: string,
  mention: ActiveMention,
  cursor: number,
  user: ChatEligibleUser,
): { text: string; cursor: number } {
  const before = text.slice(0, mention.atIndex);
  const after = text.slice(cursor);
  const mentionText = `@${chatUserDisplayName(user)} `;
  const nextText = before + mentionText + after;
  return { text: nextText, cursor: before.length + mentionText.length };
}
