"use client";

import { cn } from "@/lib/utils";

/**
 * Semantic tones instead of arbitrary hexes. Each one pairs a soft fill with an
 * ink that is >= 4.5:1 against it, so callers cannot accidentally ship an
 * unreadable pill by picking a colour that looks nice.
 */
export type StatusTone = "neutral" | "info" | "success" | "warn" | "danger";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-rm-neutral-soft text-rm-neutral-ink",
  info: "bg-rm-info-soft text-rm-info-ink",
  success: "bg-rm-success-soft text-rm-success-ink",
  warn: "bg-rm-warn-soft text-rm-warn-ink",
  danger: "bg-rm-danger-soft text-rm-danger-ink",
};

export function StatusPill({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
