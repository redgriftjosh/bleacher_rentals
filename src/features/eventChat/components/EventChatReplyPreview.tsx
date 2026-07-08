"use client";

import { X } from "lucide-react";

type Props = {
  authorName: string;
  bodyPreview: string;
  onCancel: () => void;
};

/** Reply bar above the composer while drafting a reply. */
export function EventChatReplyPreview({ authorName, bodyPreview, onCancel }: Props) {
  return (
    <div className="flex items-stretch gap-2 px-4 pt-3 pb-0 bg-white border-t border-gray-200">
      <div className="w-0.5 rounded-full bg-blue-500 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-blue-600 truncate">{authorName}</p>
        <p className="text-xs text-gray-500 truncate">{bodyPreview}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 text-gray-400 hover:text-gray-700 transition cursor-pointer flex-shrink-0 self-start"
        aria-label="Cancel reply"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
