"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkTrackerDragConfirmStore } from "@/features/workTrackers/state/useWorkTrackerDragConfirmStore";

export default function WorkTrackerDragConfirmModal() {
  const pending = useWorkTrackerDragConfirmStore((s) => s.pending);
  const respond = useWorkTrackerDragConfirmStore((s) => s.respond);

  const driverName = pending
    ? [pending.tracker.driverFirstName, pending.tracker.driverLastName].filter(Boolean).join(" ")
    : "";

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) respond(false);
      }}
    >
      <DialogContent className="max-w-md z-[2101]">
        <DialogHeader>
          <DialogTitle>Move Accepted Trip?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">
              This trip has already been accepted
              {driverName ? ` by ${driverName}` : " by the driver"}. Moving it will move it back to{" "}
              <span className="font-semibold">Released</span> status, and the driver will need to
              accept it again.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            The driver will be notified about the changes. Do you want to continue?
          </p>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <button
            onClick={() => respond(false)}
            className="px-4 py-2 text-sm font-medium rounded border border-gray-300 hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => respond(true)}
            className="px-4 py-2 text-sm font-semibold rounded text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
          >
            Move Trip
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
