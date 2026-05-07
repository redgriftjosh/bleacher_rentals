"use client";
import { useState } from "react";
import { Trash2, Undo2, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertRemindMeModal } from "./AlertRemindMeModal";
import { loadEventForModal } from "@/features/eventConfiguration/functions/loadEventForModal";
import type { UserAlertRow } from "../hooks/useUserAlerts";

type Props = {
  alert: UserAlertRow;
  onDismiss: (userAlertId: string) => void;
  onUndismiss: (userAlertId: string) => void;
  onRemindLater: (userAlertId: string, date: string) => void;
};

export function AlertDropDownListItem({ alert, onDismiss, onUndismiss, onRemindLater }: Props) {
  const [remindModalOpen, setRemindModalOpen] = useState(false);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const isDismissed =
    !!alert.dismissed && (alert.dismissedUntil === null || alert.dismissedUntil > today);

  const isEventLink = alert.entityType === "event";

  const handleBodyClick = () => {
    if (isEventLink && alert.entityUuid) {
      loadEventForModal(alert.entityUuid);
      router.push("/dashboard");
    }
  };

  return (
    <>
      <div className="flex flex-row items-center gap-1 px-3 py-2.5 border-b border-gray-100 last:border-b-0">
        {/* Column 1 - content */}
        <div
          className={`flex-1 min-w-0 ${isEventLink ? "cursor-pointer hover:opacity-80" : ""}`}
          onClick={handleBodyClick}
        >
          {alert.title && (
            <p className="-mb-1 font-semibold text-gray-900 truncate">{alert.title}</p>
          )}
          {alert.entityDescription && (
            <p className="text-sm text-gray-600 truncate -mb-1">{alert.entityDescription}</p>
          )}
          {alert.message && (
            <p className="text-xs text-gray-500 line-clamp-2 break-words">{alert.message}</p>
          )}
        </div>

        {/* Column 2 - dismiss or undismiss */}
        {isDismissed ? (
          <button
            className="shrink-0 p-1.5 rounded-sm hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
            onClick={() => onUndismiss(alert.userAlertId)}
            title="Undismiss"
          >
            <Undo2 size={15} />
          </button>
        ) : (
          <button
            className="shrink-0 p-1.5 rounded-sm hover:bg-gray-100 text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
            onClick={() => onDismiss(alert.userAlertId)}
            title="Dismiss"
          >
            <Trash2 size={15} />
          </button>
        )}

        {/* Column 3 - remind me later */}
        <button
          className="shrink-0 p-1.5 rounded-sm hover:bg-gray-100 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors"
          onClick={() => setRemindModalOpen(true)}
          title="Remind me later"
        >
          <BellRing size={15} />
        </button>
      </div>

      <AlertRemindMeModal
        open={remindModalOpen}
        onClose={() => setRemindModalOpen(false)}
        onConfirm={(date) => {
          onRemindLater(alert.userAlertId, date);
          setRemindModalOpen(false);
        }}
      />
    </>
  );
}
