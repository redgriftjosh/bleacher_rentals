import { Toggle } from "../Toggle";
import React from "react";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { useCurrentEventStore } from "../../useCurrentEventStore";

export const CoreTab = () => {
  const currentEventStore = useCurrentEventStore();

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="Enter event name"
          value={currentEventStore.eventName}
          onChange={(e) => currentEventStore.setField("eventName", e.target.value)}
        />
        <label className="block mt-1 text-sm font-medium text-gray-700">Address</label>
        <AddressAutocomplete
          onAddressSelect={(data) => currentEventStore.setField("addressData", data)}
          initialValue={currentEventStore.addressData?.address || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Start</label>
        <input
          type="date"
          className="w-full p-2 border rounded"
          value={currentEventStore.eventStart}
          onChange={(e) => currentEventStore.setField("eventStart", e.target.value)}
        />
        <label className="block text-sm font-medium text-gray-700 mt-1">Event End</label>
        <input
          type="date"
          className="w-full p-2 border rounded"
          value={currentEventStore.eventEnd}
          onChange={(e) => currentEventStore.setField("eventEnd", e.target.value)}
        />
      </div>
      <div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex-1 ">
              Setup Start
            </label>
            <input
              type="date"
              className={`w-full p-2 border rounded flex-1 ${
                currentEventStore.sameDaySetup ? "bg-gray-100 text-gray-100 cursor-not-allowed" : ""
              }`}
              value={currentEventStore.setupStart}
              onChange={(e) => currentEventStore.setField("setupStart", e.target.value)}
              disabled={currentEventStore.sameDaySetup}
            />
          </div>
          <Toggle
            label="Same-Day"
            tooltip={false}
            checked={currentEventStore.sameDaySetup}
            onChange={(e) => currentEventStore.setField("sameDaySetup", e)}
          />
        </div>
        <div className="flex gap-4 mt-1">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 flex-1">Teardown End</label>
            <input
              type="date"
              className={`w-full p-2 border rounded flex-1 ${
                currentEventStore.sameDayTeardown
                  ? "bg-gray-100 text-gray-100 cursor-not-allowed"
                  : ""
              }`}
              value={currentEventStore.teardownEnd ?? ""}
              onChange={(e) => currentEventStore.setField("teardownEnd", e.target.value)}
              disabled={currentEventStore.sameDayTeardown}
            />
          </div>
          <div className="mt-5 mr-6">
            <Toggle
              label=""
              tooltip={false}
              checked={currentEventStore.sameDayTeardown}
              onChange={(e) => currentEventStore.setField("sameDayTeardown", e)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
