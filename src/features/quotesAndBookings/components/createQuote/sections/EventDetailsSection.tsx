"use client";

import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import AddressAutocomplete from "@/components/AddressAutoComplete";

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
        <AddressAutocomplete
          initialValue={store.eventAddress}
          onAddressSelect={(data) => {
            store.setField("eventAddress", data.address);
            store.setField("eventAddressData", {
              street: data.address ?? "",
              city: data.city ?? "",
              stateProvince: data.state ?? "",
              zipPostal: data.postalCode ?? "",
            });
          }}
          className="h-[40px] px-3 border rounded text-sm"
        />
        {store.eventAddressData?.city && (
          <p className="text-xs text-gray-500 mt-1">
            {store.eventAddressData.city}
            {store.eventAddressData.stateProvince ? `, ${store.eventAddressData.stateProvince}` : ""}
            {store.eventAddressData.zipPostal ? ` ${store.eventAddressData.zipPostal}` : ""}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
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
