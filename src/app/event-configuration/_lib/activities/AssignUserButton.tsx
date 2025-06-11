"use client";
import BleacherLabel from "@/app/(dashboards)/bleachers-dashboard/_lib/_components/BleacherLabel";
import { getDashboardBleacherById } from "../functions";
import {
  Activity,
  useCurrentEventStore,
} from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";

export default function AssignUserButton({
  activity,
  index,
}: {
  activity: Activity;
  index: number;
}) {
  const bleacher = getDashboardBleacherById(activity.bleacherId);
  const setField = useCurrentEventStore((s) => s.setField);
  return (
    <button
      className="border p-2 rounded hover:bg-gray-100 cursor-pointer"
      onClick={() => setField("assignMode", { type: "bleacher", activityIndex: index })}
    >
      {bleacher !== null ? (
        <div className="-ml-2 -my-1">
          <BleacherLabel bleacher={bleacher} />
        </div>
      ) : (
        <div className="text-sm text-gray-700 font-medium">Select a Driver</div>
      )}
    </button>
  );
}
