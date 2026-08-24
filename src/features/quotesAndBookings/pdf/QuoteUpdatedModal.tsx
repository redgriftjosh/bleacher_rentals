"use client";

import { RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { QuoteLanguage } from "./quoteLanguage";
import { quoteText } from "./quoteStrings";

/**
 * Blocking "this quote was updated" notice for the public quote page. The only exit is
 * Refresh — no dismiss, no Esc, no backdrop close — so the client always ends up on the
 * current version. Reused for the poll-driven case and the sign-time 409 guard.
 * See docs/specs/quote-staleness-detection.md §10.
 */
export function QuoteUpdatedModal({
  open,
  onRefresh,
  description,
  language = "en",
}: {
  open: boolean;
  onRefresh: () => void;
  description?: string;
  language?: QuoteLanguage;
}) {
  const s = quoteText(language);

  return (
    <Dialog open={open}>
      <DialogContent
        // Blocking: swallow every dismissal path; `[&>button]:hidden` hides the built-in X.
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="[&>button]:hidden"
      >
        <DialogTitle>{s.quoteUpdatedTitle}</DialogTitle>
        <DialogDescription>{description ?? s.quoteUpdatedBody}</DialogDescription>
        {/* Wrapped so the `[&>button]:hidden` above (which hides Radix's built-in X) does
            not also hide this action button. */}
        <div className="mt-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-darkBlue px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            {s.refresh}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
