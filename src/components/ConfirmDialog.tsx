"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Paints the confirm action as destructive and shows the warning icon. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Confirmation dialog, replacing the native `confirm()` — native dialogs block the
 * main thread, cannot be styled, and are suppressed outright in some embedded
 * browsers, which would silently turn a Delete button into a no-op.
 *
 * Deliberately a standard web dialog: left-aligned copy, weighted actions in the
 * bottom-right, cancel quiet and confirm solid.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-rm-ink/30" onClick={onCancel} />

      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-rm-surface shadow-rm-modal">
        <div className="flex gap-3.5 p-5">
          {destructive && (
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rm-danger-soft text-rm-danger"
            >
              <TriangleAlert className="size-[18px]" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={titleId} className="text-[15px] font-semibold text-rm-ink">
              {title}
            </h2>
            {message && (
              <p id={messageId} className="mt-1 text-[13px] leading-relaxed text-rm-ink-muted">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-rm-hairline bg-rm-sunken px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-lg bg-rm-surface px-3.5 py-2 text-[14px] font-medium text-rm-ink-muted ring-1 ring-rm-hairline transition-colors hover:text-rm-ink focus-visible:ring-2 focus-visible:ring-rm-accent focus-visible:outline-none disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={cn(
              "cursor-pointer rounded-lg px-3.5 py-2 text-[14px] font-medium text-white transition-colors",
              "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:opacity-50",
              destructive
                ? "bg-rm-danger hover:bg-rm-danger-ink focus-visible:ring-rm-danger"
                : "bg-darkBlue hover:bg-lightBlue focus-visible:ring-rm-accent",
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
