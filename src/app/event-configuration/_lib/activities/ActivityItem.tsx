"use client";

import {
  Activity,
  useCurrentEventStore,
} from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { Dropdown } from "@/components/DropDown";
import { Trash2 } from "lucide-react";
import { getActivityTypeOptions, getDriversOptions } from "../functions";
import FullscreenModal from "./AssignOverlay";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import BleacherLabel from "@/app/(dashboards)/bleachers-dashboard/_lib/_components/BleacherLabel";
import AssignBleacherButton from "./AssignBleacherButton";
import { useEffect } from "react";
import { DatePicker } from "@/components/DatePicker";
import AssignUserButton from "./AssignUserButton";

export default function ActivityItem({ activity, index }: { activity: Activity; index: number }) {
  const activities = useCurrentEventStore((s) => s.activities);
  const assignMode = useCurrentEventStore((s) => s.assignMode);
  const setField = useCurrentEventStore((s) => s.setField);
  const activityOptions = getActivityTypeOptions();
  const driverOptions = getDriversOptions();

  const updateField = (key: keyof Activity, value: any) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], [key]: value };
    setField("activities", updated);
  };

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
      {assignMode && <FullscreenModal />}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Activity Type</label>
          <Dropdown
            options={activityOptions}
            selected={activity.activityType}
            onSelect={(e) => updateField("activityType", e)}
            placeholder="Row"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Date</label>
          <DatePicker
            date={activity.date ? new Date(activity.date) : undefined}
            onChange={(d) => updateField("date", d?.toISOString() ?? "")}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">From</label>
          <AddressAutocomplete
            onAddressSelect={(data) =>
              updateField("fromAddress", {
                ...data,
                addressId: activity.fromAddress?.addressId ?? null,
              })
            }
            initialValue={activity.fromAddress?.address || ""}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">To</label>
          <AddressAutocomplete
            onAddressSelect={(data) =>
              updateField("toAddress", {
                ...data,
                addressId: activity.toAddress?.addressId ?? null,
              })
            }
            initialValue={activity.toAddress?.address || ""}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Bleacher</label>
          <AssignBleacherButton activity={activity} index={index} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Driver</label>
          <Dropdown
            options={driverOptions}
            selected={activity.userId}
            onSelect={(e) => updateField("userId", e)}
            placeholder="Driver"
          />
        </div>
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
