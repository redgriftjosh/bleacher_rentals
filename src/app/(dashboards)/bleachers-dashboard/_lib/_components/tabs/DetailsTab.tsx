import { LenientSelections } from "../LenientSelections";
import { Toggle } from "../Toggle";
import React from "react";
import { Dropdown } from "@/components/DropDown";
import { Textarea } from "@/components/TextArea";
import { EventStatus, useCurrentEventStore } from "../../useCurrentEventStore";

export const DetailsTab = () => {
  const currentEventStore = useCurrentEventStore();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <LenientSelections />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <Dropdown
              options={[
                { label: "Quoted", value: "Quoted" },
                { label: "Booked", value: "Booked" },
              ]}
              selected={currentEventStore.selectedStatus}
              onSelect={(e) => currentEventStore.setField("selectedStatus", e as EventStatus)}
              placeholder="Pick status"
            />
          </div>
          <div className="mt-0.5">
            <Toggle
              label="Must Be Clean"
              tooltip={false}
              checked={currentEventStore.mustBeClean}
              onChange={(e) => currentEventStore.setField("mustBeClean", e)}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <Textarea
          placeholder="Type your message here."
          value={currentEventStore.notes}
          onChange={(e) => currentEventStore.setField("notes", e.target.value)}
        />
      </div>
    </div>
  );
};
