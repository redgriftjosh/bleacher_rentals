"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  saving: boolean;
  /** Persist the quote, then leave on success. */
  onSave: () => void;
  /** Drop the changes and leave. */
  onDiscard: () => void;
  /** Stay on the page. */
  onCancel: () => void;
};

export function UnsavedChangesDialog({ open, saving, onSave, onDiscard, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes to this quote. Save them, discard them, or stay on the page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={saving}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Discard changes
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save & leave"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
