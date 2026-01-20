"use client";

import { Send, FilePen, CheckCircle, Play, Award, XCircle } from "lucide-react";
import { Toggle } from "@/components/Toggle";
import { Tables } from "../../../../database.types";

type WorkTrackerStatusBadgeProps = {
  status: Tables<"WorkTrackers">["status"];
  onStatusChange?: (newStatus: "draft" | "released") => void;
  canEdit?: boolean;
};

export default function WorkTrackerStatusBadge({
  status,
  onStatusChange,
  canEdit = false,
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
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
          <FilePen className="h-4 w-4 text-darkBlue" />
          <span className="text-sm font-medium text-darkBlue">Draft</span>
        </div>
      );

    case "released":
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
          <Send className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-600">Released</span>
        </div>
      );

    case "accepted":
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-500 rounded-md">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-600">Accepted</span>
        </div>
      );

    case "dest_pickup":
    case "pickup_inspection":
    case "dest_dropoff":
    case "dropoff_inspection":
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
          <Play className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">In Progress</span>
        </div>
      );

    case "completed":
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
          <Award className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-600">Completed</span>
        </div>
      );

    case "cancelled":
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-600">Cancelled</span>
        </div>
      );

    default:
      return null;
  }
}
