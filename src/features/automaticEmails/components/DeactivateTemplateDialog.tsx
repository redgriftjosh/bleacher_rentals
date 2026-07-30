"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, TriangleAlert } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms deactivation. Should throw on failure. */
  onConfirm: () => Promise<void>;
  triggerLabel: string;
};

export function DeactivateTemplateDialog({ open, onClose, onConfirm, triggerLabel }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Errors are toasted by the caller.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Stop sending these emails?
          </DialogTitle>
          <DialogDescription className="pt-1 text-sm leading-relaxed text-gray-600">
            Deactivating this template will{" "}
            <strong className="text-gray-800">immediately stop all {triggerLabel} emails</strong>{" "}
            from this sales office. No replacement template will take over — the trigger goes
            completely silent.
            <br />
            <br />
            Clients and account managers who rely on these notifications won&apos;t receive them
            until a new template is activated. Depending on the trigger, that could mean missed
            confirmations, unsigned quotes, or drivers left without instructions.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-sm hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-700 text-white rounded-sm hover:bg-red-800 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deactivating…
              </>
            ) : (
              "Yes, deactivate"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
