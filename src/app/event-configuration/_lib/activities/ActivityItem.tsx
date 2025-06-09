"use client";

import {
  Activity,
  useCurrentEventStore,
} from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { Trash2 } from "lucide-react";

export default function ActivityItem({ activity, index }: { activity: Activity; index: number }) {
  const activities = useCurrentEventStore((s) => s.activities);
  const setField = useCurrentEventStore((s) => s.setField);

  const deleteActivity = () => {
    const updated = [...activities];
    updated.splice(index, 1);
    setField("activities", updated);
  };
  return (
    <div
      key={index}
      className="flex items-center gap-4 bg-white border rounded-md p-3 mb-2 shadow-sm justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Row Type</label>
          <Dropdown
            options={rowOptions}
            selected={requirement.rows}
            onSelect={(e) => updateField("rows", e)}
            placeholder="Row"
          />
        </div>
        <div>
          <span className="text-xs text-gray-500">Type</span>
          <p className="font-medium">{activity.activityType}</p>
        </div>
        {activity.bleacherId !== null && (
          <div>
            <span className="text-xs text-gray-500">Bleacher</span>
            <p className="font-medium">#{activity.bleacherId}</p>
          </div>
        )}
        {activity.fromAddress?.address && (
          <div>
            <span className="text-xs text-gray-500">From</span>
            <p className="font-medium">{activity.fromAddress.address}</p>
          </div>
        )}
        {activity.toAddress?.address && (
          <div>
            <span className="text-xs text-gray-500">To</span>
            <p className="font-medium">{activity.toAddress.address}</p>
          </div>
        )}
        {activity.userId !== null && (
          <div>
            <span className="text-xs text-gray-500">User ID</span>
            <p className="font-medium">{activity.userId}</p>
          </div>
        )}
      </div>
      <button
        onClick={deleteActivity}
        className="text-gray-500 hover:text-red-600 transition cursor-pointer"
        title="Delete requirement"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
