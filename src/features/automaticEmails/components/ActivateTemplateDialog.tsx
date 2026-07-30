"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import successAnimation from "../../../../public/animations/Success.json";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms. Should throw on failure. */
  onConfirm: () => Promise<void>;
  triggerLabel: string;
};

export function ActivateTemplateDialog({ open, onClose, onConfirm, triggerLabel }: Props) {
  const [phase, setPhase] = useState<"confirm" | "activating" | "success">("confirm");

  // Reset to confirm phase whenever the dialog re-opens.
  useEffect(() => {
    if (!open) setPhase("confirm");
  }, [open]);

  const handleConfirm = async () => {
    setPhase("activating");
    try {
      await onConfirm();
      setPhase("success");
    } catch {
      // Errors are toasted by the caller.
      setPhase("confirm");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && phase !== "activating" && onClose()}>
      <DialogContent className="max-w-sm">
        {phase === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Activate this template?</DialogTitle>
              <DialogDescription>
                This template will handle all <strong>{triggerLabel}</strong> emails for this sales
                office. If another template is currently active for this trigger, it will be
                deactivated automatically.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-sm hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 text-sm bg-darkBlue text-white rounded-sm hover:bg-lightBlue cursor-pointer"
              >
                Activate template
              </button>
            </DialogFooter>
          </>
        )}

        {phase === "activating" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Activating…</p>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-2 pb-4 text-center">
            <Lottie
              animationData={successAnimation}
              loop={false}
              style={{ width: 160, height: 160 }}
            />
            <p className="text-base font-semibold text-gray-900">Template activated!</p>
            <p className="text-sm text-gray-500">
              All <strong>{triggerLabel}</strong> emails from this sales office will now use this
              template.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 cursor-pointer rounded-sm bg-darkBlue px-6 py-2 text-sm text-white hover:bg-lightBlue"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
