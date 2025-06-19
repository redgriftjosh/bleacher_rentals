"use client";

import {
  Activity,
  useCurrentEventStore,
} from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { Dropdown } from "@/components/DropDown";
import { Trash2 } from "lucide-react";
import { getActivityTypeOptions, getDriversOptions } from "../functions";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { DatePicker } from "@/components/DatePicker";

export default function ActivityItem({ activity, index }: { activity: Activity; index: number }) {
  // const activities = useCurrentEventStore((s) => s.activities);
  // const assignMode = useCurrentEventStore((s) => s.assignMode);
  const setField = useCurrentEventStore((s) => s.setField);
  const activityOptions = getActivityTypeOptions();
  const driverOptions = getDriversOptions();

  // const updateField = (key: keyof Activity, value: any) => {
  //   const updated = [...activities];
  //   updated[index] = { ...updated[index], [key]: value };
  //   setField("activities", updated);
  // };

  // const deleteActivity = () => {
  //   const updated = [...activities];
  //   updated.splice(index, 1);
  //   setField("activities", updated);
  // };
  return (
    <div
      key={index}
      className="flex items-center gap-4 bg-white border rounded p-3 mb-2 shadow-sm justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Activity Type</label>
          <Dropdown
            options={activityOptions}
            selected={activity.activityType}
            // onSelect={(e) => updateField("activityType", e)}
            onSelect={(e) => console.log("e", e)}
            placeholder="Row"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Date</label>
          <DatePicker
            date={activity.date ? new Date(activity.date) : undefined}
            // onChange={(d) => updateField("date", d?.toISOString() ?? "")}
            onChange={(d) => console.log("d", d)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">From</label>
          <AddressAutocomplete
            // onAddressSelect={(data) =>
            //   updateField("fromAddress", {
            //     ...data,
            //     addressId: activity.fromAddress?.addressId ?? null,
            //   })
            // }
            onAddressSelect={(data) => console.log("data", data)}
            initialValue={activity.fromAddress?.address || ""}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">To</label>
          <AddressAutocomplete
            // onAddressSelect={(data) =>
            //   updateField("toAddress", {
            //     ...data,
            //     addressId: activity.toAddress?.addressId ?? null,
            //   })
            // }
            onAddressSelect={(data) => console.log("data", data)}
            initialValue={activity.toAddress?.address || ""}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Driver</label>
          <Dropdown
            options={driverOptions}
            selected={activity.userId}
            // onSelect={(e) => updateField("userId", e)}
            onSelect={(e) => console.log("e", e)}
            placeholder="Driver"
          />
        </div>
      </div>
      <button
        // onClick={deleteActivity}
        className="text-gray-500 hover:text-red-600 transition cursor-pointer"
        title="Delete requirement"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
