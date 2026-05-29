"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";

export function EventDetailsSection() {
  const store = useCreateQuoteStore();

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Event Details
      </h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
        <input
          type="text"
          value={store.eventName}
          onChange={(e) => store.setField("eventName", e.target.value)}
          placeholder="Stadium Concert 2024"
          className="w-full h-[40px] px-3 border rounded text-sm"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Address</label>
        <input
          type="text"
          value={store.eventAddress}
          onChange={(e) => store.setField("eventAddress", e.target.value)}
          placeholder="Auto-filled from venue selection"
          className="w-full h-[40px] px-3 border rounded text-sm bg-gray-50 text-gray-500"
          disabled
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Drop Arrival Date</label>
          <input
            type="date"
            value={store.dropArrivalDate}
            onChange={(e) => store.setField("dropArrivalDate", e.target.value)}
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pick Up Date</label>
          <input
            type="date"
            value={store.pickUpDate}
            onChange={(e) => store.setField("pickUpDate", e.target.value)}
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Start</label>
          <input
            type="date"
            value={store.eventStart}
            onChange={(e) => store.setField("eventStart", e.target.value)}
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event End</label>
          <input
            type="date"
            value={store.eventEnd}
            onChange={(e) => store.setField("eventEnd", e.target.value)}
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
      </div>
    </section>
  );
}
