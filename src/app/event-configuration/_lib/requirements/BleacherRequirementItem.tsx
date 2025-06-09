"use client";

import { Toggle } from "@/app/(dashboards)/bleachers-dashboard/_lib/_components/event-configuration/Toggle";
import { getRowOptions } from "@/app/(dashboards)/bleachers-dashboard/_lib/functions";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { BleacherRequirements } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Dropdown } from "@/components/DropDown";
import { Trash2 } from "lucide-react";
import { DateTime } from "luxon";

export default function BleacherRequirementItem({
  requirement,
  index,
}: {
  requirement: BleacherRequirements;
  index: number;
}) {
  const setField = useCurrentEventStore((s) => s.setField);
  const requirements = useCurrentEventStore((s) => s.bleacherRequirements);
  const rowOptions = getRowOptions();

  const updateField = (key: keyof BleacherRequirements, value: any) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [key]: value };
    setField("bleacherRequirements", updated);
  };

  const deleteRequirement = () => {
    const updated = [...requirements];
    updated.splice(index, 1);
    setField("bleacherRequirements", updated);
  };

  return (
    <div className="flex items-center gap-4 bg-white border rounded-md p-3 mb-2 shadow-sm justify-between">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Qty</label>
          <input
            type="number"
            min="0"
            className="w-[50px] border rounded p-2"
            value={requirement.qty ?? ""}
            onChange={(e) => updateField("qty", Number(e.target.value))}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Row Type</label>
          <Dropdown
            options={rowOptions}
            selected={requirement.rows}
            onSelect={(e) => updateField("rows", e)}
            placeholder="Row"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Setup</label>
          <DateRangePicker
            onUpdate={({ range }) => {
              if (range.from) {
                const setupFrom = new Date(range.from).toISOString().split("T")[0];
                updateField("setupFrom", setupFrom);
              }
              if (range.to) {
                const setupTo = new Date(range.to).toISOString().split("T")[0];
                updateField("setupTo", setupTo);
              }
            }}
            initialDateFrom={DateTime.now().plus({ days: 7 }).toISODate()} // 7 days from now
            initialDateTo={DateTime.now().plus({ days: 14 }).toISODate()} // 14 days from now
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Teardown</label>
          <DateRangePicker
            onUpdate={({ range }) => {
              if (range.from) {
                const teardownFrom = new Date(range.from).toISOString().split("T")[0];
                updateField("teardownFrom", teardownFrom);
              }
              if (range.to) {
                const teardownTo = new Date(range.to).toISOString().split("T")[0];
                updateField("teardownTo", teardownTo);
              }
            }}
            initialDateFrom={DateTime.now().plus({ days: 7 }).toISODate()} // 7 days from now
            initialDateTo={DateTime.now().plus({ days: 14 }).toISODate()} // 14 days from now
          />
        </div>

        <div className="mb-2">
          <Toggle
            label="Clean"
            tooltip={false}
            checked={requirement.mustBeClean}
            onChange={(e) => updateField("mustBeClean", e)}
          />
        </div>
      </div>
      <button
        onClick={deleteRequirement}
        className="text-gray-500 hover:text-red-600 transition cursor-pointer"
        title="Delete requirement"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
