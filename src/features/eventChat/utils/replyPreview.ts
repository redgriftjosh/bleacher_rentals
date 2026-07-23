/** One-line preview for reply banner and quote blocks. */
export function truncateReplyPreview(body: string, maxLen = 100): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}

/** Active reply draft above the composer. */
export type EventChatReplyTarget = {
  messageId: string;
  authorName: string;
  bodyPreview: string;
};
