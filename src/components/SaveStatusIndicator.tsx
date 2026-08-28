"use client";

import { Check, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveState } from "@/lib/autosave";

type Props = {
  state: SaveState;
  onRetry?: () => void;
  className?: string;
};

/**
 * Replaces the Save button on autosaved forms.
 *
 * It keeps a fixed footprint across all four states so the footer never jumps as the
 * label switches between "Saving…" and "Saved".
 */
export function SaveStatusIndicator({ state, onRetry, className }: Props) {
  if (state === "error") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn("flex items-center gap-1.5 text-[13px] text-[#FF3B30]", className)}
      >
        <TriangleAlert className="size-3.5" aria-hidden="true" />
        Couldn&apos;t save
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-0.5 cursor-pointer font-medium text-[#007AFF] underline-offset-2 hover:underline"
          >
            Retry
          </button>
        )}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-w-[68px] items-center gap-1.5 text-[13px] text-[#8E8E93] transition-opacity duration-200",
        state === "idle" && "opacity-0",
        className,
      )}
    >
      {state === "saving" ? (
        <>
          <Loader2
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Saving…
        </>
      ) : (
        <>
          <Check className="size-3.5" aria-hidden="true" />
          Saved
        </>
      )}
    </span>
  );
}
