"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Copy, Pencil } from "lucide-react";

type Props = {
  open: boolean;
  /** User chose to edit the live template anyway. */
  onEditAnyway: () => void;
  /** User wants a duplicate. Async — should create the copy and navigate. */
  onDuplicate: () => Promise<void>;
};

export function ActiveTemplateWarningDialog({ open, onEditAnyway, onDuplicate }: Props) {
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      await onDuplicate();
    } catch {
      setDuplicating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !duplicating && onEditAnyway()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            This template is live
          </DialogTitle>
          <DialogDescription className="pt-1 text-sm leading-relaxed text-gray-600">
            Any edits you make here take effect immediately. If this trigger fires while you&apos;re
            mid-edit, the email will be sent exactly as it was last saved — even if it&apos;s
            incomplete.
            <br />
            <br />
            The safe approach is to{" "}
            <strong className="text-gray-800">duplicate this template</strong>, make your changes
            there, then activate the copy when it&apos;s ready.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          {/* Primary: duplicate */}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex items-center justify-center gap-2 rounded-sm bg-darkBlue px-4 py-2.5 text-sm font-medium text-white hover:bg-lightBlue disabled:opacity-50 cursor-pointer"
          >
            {duplicating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating copy…
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Duplicate this template
              </>
            )}
          </button>

          {/* Secondary: edit live */}
          <button
            type="button"
            onClick={onEditAnyway}
            disabled={duplicating}
            className="flex items-center justify-center gap-2 rounded-sm border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            Edit live template — I understand changes are immediate
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
