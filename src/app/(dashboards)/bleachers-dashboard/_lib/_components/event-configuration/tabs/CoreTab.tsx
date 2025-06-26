"use client";
import { Toggle } from "../Toggle";
import React, { useEffect } from "react";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { useCurrentEventStore } from "../../../useCurrentEventStore";

export const CoreTab = () => {
  const currentEventStore = useCurrentEventStore();

  // Helper to clamp or auto-adjust invalid dates
  useEffect(() => {
    const s = currentEventStore;

    const oneDayBefore = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    };

    const oneDayAfter = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    };

    // 1. Auto-set setupStart the first time eventStart is set
    if (s.eventStart && !s.setupStart) {
      s.setField("setupStart", oneDayBefore(s.eventStart));
    }

    // 2. Sync eventEnd with eventStart if it's too early
    if (s.eventStart && s.eventEnd && s.eventStart > s.eventEnd) {
      s.setField("eventEnd", s.eventStart);
    }

    // 3. Sync eventStart with eventEnd if it's too late
    if (s.eventStart && s.eventEnd && s.eventEnd < s.eventStart) {
      s.setField("eventStart", s.eventEnd);
    }

    // 4. Setup must be before eventStart
    if (s.setupStart && s.eventStart && s.setupStart >= s.eventStart) {
      s.setField("setupStart", oneDayBefore(s.eventStart));
    }

    // 5. Teardown must be after eventEnd
    if (s.teardownEnd && s.eventEnd && s.teardownEnd <= s.eventEnd) {
      s.setField("teardownEnd", oneDayAfter(s.eventEnd));
    }
  }, [
    currentEventStore.eventStart,
    currentEventStore.eventEnd,
    currentEventStore.setupStart,
    currentEventStore.teardownEnd,
  ]);

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
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
          onAddressSelect={(data) =>
            currentEventStore.setField("addressData", {
              ...data,
              addressId: currentEventStore.addressData?.addressId ?? null,
            })
          }
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
          max={currentEventStore.eventEnd || undefined}
        />
        <label className="block text-sm font-medium text-gray-700 mt-1">Event End</label>
        <input
          type="date"
          className="w-full p-2 border rounded"
          value={currentEventStore.eventEnd}
          onChange={(e) => currentEventStore.setField("eventEnd", e.target.value)}
          min={currentEventStore.eventStart || undefined}
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
              max={
                currentEventStore.eventStart
                  ? new Date(new Date(currentEventStore.eventStart).getTime() - 86400000) // 1 day before
                      .toISOString()
                      .split("T")[0]
                  : undefined
              }
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
              min={
                currentEventStore.eventEnd
                  ? new Date(new Date(currentEventStore.eventEnd).getTime() + 86400000) // 1 day after
                      .toISOString()
                      .split("T")[0]
                  : undefined
              }
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Good Shuffle</label>
        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="Enter goodshuffle url"
          value={currentEventStore.goodshuffleUrl ?? ""}
          onChange={(e) => currentEventStore.setField("goodshuffleUrl", e.target.value)}
        />
      </div>
    </div>
  );
};
