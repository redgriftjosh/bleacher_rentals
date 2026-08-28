"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Paints the confirm action red, for deletes. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * iOS-style alert, replacing the native `confirm()`.
 *
 * Native dialogs block the main thread, can't be styled, and are suppressed outright in
 * some embedded browsers — which would silently turn "Delete" into a no-op.
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
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
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
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onCancel} />

      <div className="relative w-full max-w-[270px] overflow-hidden rounded-[14px] bg-white/95 text-center shadow-rm-modal backdrop-blur-xl">
        <div className="px-4 pt-5 pb-4">
          <h2 className="text-[17px] leading-tight font-semibold text-gray-900">{title}</h2>
          {message && <p className="mt-1.5 text-[13px] leading-snug text-rm-ink">{message}</p>}
        </div>

        <div className="grid grid-cols-2 border-t border-rm-hairline">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer border-r border-rm-hairline py-3 text-[17px] text-rm-accent transition-colors hover:bg-black/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={cn(
              "cursor-pointer py-3 text-[17px] font-semibold transition-colors hover:bg-black/5 disabled:opacity-50",
              destructive ? "text-rm-danger" : "text-rm-accent",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
