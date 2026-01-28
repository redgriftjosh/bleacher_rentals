"use client";

import { Send, FilePen, CheckCircle, Play, Award, XCircle } from "lucide-react";
import { Toggle } from "@/components/Toggle";
import { Tables } from "../../../../database.types";
import { WORKTRACKER_STATUS_COLORS } from "../constants";

type WorkTrackerStatusBadgeProps = {
  status: Tables<"WorkTrackers">["status"];
  onStatusChange?: (newStatus: "draft" | "released") => void;
  canEdit?: boolean;
  showText?: boolean;
};

export default function WorkTrackerStatusBadge({
  status,
  onStatusChange,
  canEdit = false,
  showText = true,
}: WorkTrackerStatusBadgeProps) {
  // Draft/Released toggle (editable by Account Managers)
  if (canEdit && (status === "draft" || status === "released")) {
    return (
      <div className="flex items-center gap-2">
        <FilePen className={`h-4 w-4 ${status === "draft" ? "text-darkBlue" : "text-gray-400"}`} />
        <span className={`text-sm ${status === "draft" ? "text-darkBlue" : "text-gray-500"}`}>
          Draft
        </span>
        <Toggle
          checked={status === "released"}
          onChange={(checked) => onStatusChange?.(checked ? "released" : "draft")}
          label=""
          tooltip={false}
          inline={true}
        />
        <span className={`text-sm ${status === "released" ? "text-green-600" : "text-gray-500"}`}>
          Released
        </span>
        <Send className={`h-4 w-4 ${status === "released" ? "text-green-600" : "text-gray-400"}`} />
      </div>
    );
  }

  // Read-only status badges for other states
  switch (status) {
    case "draft":
      const draftColors = WORKTRACKER_STATUS_COLORS.draft;
      return (
        <div
          className={`flex items-center justify-center whitespace-nowrap ${showText ? "gap-2 px-3 py-1.5" : "p-1.5"} ${draftColors.bg} border ${draftColors.border} rounded-md`}
        >
          <FilePen className={`h-4 w-4 ${draftColors.text}`} />
          {showText && <span className={`text-sm font-medium ${draftColors.text}`}>Draft</span>}
        </div>
      );

    case "released":
      const releasedColors = WORKTRACKER_STATUS_COLORS.released;
      return (
        <div
          className={`flex items-center justify-center whitespace-nowrap ${showText ? "gap-2 px-3 py-1.5" : "p-1.5"} ${releasedColors.bg} border ${releasedColors.border} rounded-md`}
        >
          <Send className={`h-4 w-4 ${releasedColors.text}`} />
          {showText && (
            <span className={`text-sm font-medium ${releasedColors.text}`}>Released</span>
          )}
        </div>
      );

    case "accepted":
      const acceptedColors = WORKTRACKER_STATUS_COLORS.accepted;
      return (
        <div
          className={`flex items-center justify-center whitespace-nowrap ${showText ? "gap-2 px-3 py-1.5" : "p-1.5"} ${acceptedColors.bg} border ${acceptedColors.border} rounded-md`}
        >
          <CheckCircle className={`h-4 w-4 ${acceptedColors.text}`} />
          {showText && (
            <span className={`text-sm font-medium ${acceptedColors.text}`}>Accepted</span>
          )}
        </div>
      );

    case "dest_pickup":
    case "pickup_inspection":
    case "dest_dropoff":
    case "dropoff_inspection":
      const inProgressColors = WORKTRACKER_STATUS_COLORS[status];
      return (
        <div
          className={`flex items-center justify-center whitespace-nowrap ${showText ? "gap-2 px-3 py-1.5" : "p-1.5"} ${inProgressColors.bg} border ${inProgressColors.border} rounded-md`}
        >
          <Play className={`h-4 w-4 ${inProgressColors.text}`} />
          {showText && (
            <span className={`text-sm font-medium ${inProgressColors.text}`}>In Progress</span>
          )}
        </div>
      );

    case "completed":
      const completedColors = WORKTRACKER_STATUS_COLORS.completed;
      return (
        <div
          className={`flex items-center justify-center whitespace-nowrap ${showText ? "gap-2 px-3 py-1.5" : "p-1.5"} ${completedColors.bg} border ${completedColors.border} rounded-md`}
        >
          <Award className={`h-4 w-4 ${completedColors.text}`} />
          {showText && (
            <span className={`text-sm font-medium ${completedColors.text}`}>Completed</span>
          )}
        </div>
      );

    case "cancelled":
      const cancelledColors = WORKTRACKER_STATUS_COLORS.cancelled;
      return (
        <div
          className={`flex items-center justify-center whitespace-nowrap ${showText ? "gap-2 px-3 py-1.5" : "p-1.5"} ${cancelledColors.bg} border ${cancelledColors.border} rounded-md`}
        >
          <XCircle className={`h-4 w-4 ${cancelledColors.text}`} />
          {showText && (
            <span className={`text-sm font-medium ${cancelledColors.text}`}>Cancelled</span>
          )}
        </div>
      );

    default:
      return null;
  }
}
