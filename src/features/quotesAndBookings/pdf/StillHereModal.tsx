"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * "Are you still here?" prompt shown after a period of absence. The only control is Yes,
 * which resets the idle timer. See docs/specs/quote-staleness-detection.md §8/§10.
 */
export function StillHereModal({ open, onConfirm }: { open: boolean; onConfirm: () => void }) {
  return (
    <Dialog open={open}>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="[&>button]:hidden"
      >
        <DialogTitle>Are you still here?</DialogTitle>
        <DialogDescription>
          We paused checking for updates while you were away. Tap Yes to keep this quote up to date.
        </DialogDescription>
        {/* Wrapped so the `[&>button]:hidden` above (which hides Radix's built-in X) does
            not also hide this action button. */}
        <div className="mt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-md bg-darkBlue px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Yes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
