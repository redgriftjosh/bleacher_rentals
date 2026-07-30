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
  templateName: string;
  isActive: boolean;
  /** Called when the user confirms. Should throw on failure. */
  onConfirm: () => Promise<void>;
};

export function DeleteTemplateDialog({ open, onClose, templateName, isActive, onConfirm }: Props) {
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this template?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              {isActive && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">
                    This template is currently active — deleting it will immediately stop all emails
                    for this trigger.
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                <strong>&ldquo;{templateName || "Untitled template"}&rdquo;</strong> will be
                permanently removed
                {isActive ? "." : " (it\'s not active, so no emails will be affected)."} This cannot
                be undone.
              </p>
            </div>
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
                Deleting…
              </>
            ) : (
              "Delete template"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
