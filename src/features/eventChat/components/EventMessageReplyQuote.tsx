"use client";

import { truncateReplyPreview } from "../utils/replyPreview";

type Props = {
  authorName: string;
  bodyPreview: string;
  onJump: () => void;
  /** Bubble is on the right (own message). */
  isOwnBubble: boolean;
};

/** Clickable quoted parent message inside a reply bubble. */
export function EventMessageReplyQuote({
  authorName,
  bodyPreview,
  onJump,
  isOwnBubble,
}: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onJump();
      }}
      className={[
        "mb-2 w-full text-left rounded-md border-l-2 pl-2 pr-1 py-1 transition cursor-pointer",
        "hover:opacity-80",
        isOwnBubble
          ? "border-blue-500 bg-blue-200/40"
          : "border-blue-500 bg-black/5",
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold text-blue-600 truncate">{authorName}</p>
      <p className="text-[11px] text-gray-600 truncate">{bodyPreview}</p>
    </button>
  );
}

/** Build quote preview from parent message body. */
export function replyQuotePreview(body: string): string {
  return truncateReplyPreview(body);
}
