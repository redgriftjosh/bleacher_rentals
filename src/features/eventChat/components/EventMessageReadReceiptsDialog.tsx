"use client";

import { DateTime } from "luxon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { displayName, initials, useRoadmapUsers } from "@/app/roadmap/_lib/hooks/useRoadmapUsers";
import type { EventReadReceipt } from "../hooks/useReadReceipts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readers: EventReadReceipt[];
};

function formatReadAt(readAt: string): string {
  const dt = DateTime.fromISO(readAt);
  if (!dt.isValid) return "";

  const now = DateTime.now();
  if (dt.hasSame(now, "day")) {
    return dt.toFormat("h:mm a");
  }
  if (dt.hasSame(now.minus({ days: 1 }), "day")) {
    return `Yesterday at ${dt.toFormat("h:mm a")}`;
  }
  return dt.toFormat("MMM d, h:mm a");
}

/** List of users who read a message. */
export function EventMessageReadReceiptsDialog({ open, onOpenChange, readers }: Props) {
  const { userMap } = useRoadmapUsers();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Read receipts</DialogTitle>
          <DialogDescription>
            {readers.length === 0
              ? "No one has read this message yet."
              : `Seen by ${readers.length} ${readers.length === 1 ? "person" : "people"}`}
          </DialogDescription>
        </DialogHeader>

        {readers.length > 0 && (
          <ul className="max-h-72 overflow-y-auto -mx-1">
            {readers.map((reader) => {
              const user = userMap.get(reader.userUuid);
              return (
                <li
                  key={reader.userUuid}
                  className="flex items-center gap-3 px-1 py-2.5 border-b border-gray-100 last:border-b-0"
                >
                  <div
                    className="size-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: "#6b7280" }}
                  >
                    {initials(user)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName(user)}
                    </p>
                    <p className="text-xs text-gray-500">{formatReadAt(reader.readAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
