import { forwardRef } from "react";

/** Telegram-style separator between already-read and new messages. */
export const NewMessagesDivider = forwardRef<HTMLDivElement>(function NewMessagesDivider(_, ref) {
  return (
    <div ref={ref} data-new-messages-divider className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-sky-400" />
      <span className="text-[11px] font-semibold text-sky-500 uppercase tracking-wide shrink-0">
        New messages
      </span>
      <div className="flex-1 h-px bg-sky-400" />
    </div>
  );
});
