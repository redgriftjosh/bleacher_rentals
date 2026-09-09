"use client";

import { useMemo } from "react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { useEventTypes } from "../../../hooks/useEventTypes";
import { Dropdown } from "@/components/DropDown";
import AddressAutocomplete from "@/components/AddressAutoComplete";

export function EventDetailsSection() {
  const eventName = useCreateQuoteStore((s) => s.eventName);
  const eventTypeId = useCreateQuoteStore((s) => s.eventTypeId);
  const eventAddress = useCreateQuoteStore((s) => s.eventAddress);
  const eventAddressData = useCreateQuoteStore((s) => s.eventAddressData);
  const eventStart = useCreateQuoteStore((s) => s.eventStart);
  const eventEnd = useCreateQuoteStore((s) => s.eventEnd);
  const setField = useCreateQuoteStore((s) => s.setField);

  const { eventTypes } = useEventTypes();

  const eventTypeOptions = eventTypes.map((et) => ({ label: et.name, value: et.id }));

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Event Details
      </h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={eventName}
          onChange={(e) => setField("eventName", e.target.value)}
          placeholder="Stadium Concert 2024"
          className="w-full h-[40px] px-3 border rounded text-sm"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Type <span className="text-red-500">*</span>
        </label>
        <Dropdown
          options={eventTypeOptions}
          selected={eventTypeId}
          onSelect={(val) => setField("eventTypeId", val)}
          placeholder="Select event type"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Address <span className="text-red-500">*</span>
        </label>
        <AddressAutocomplete
          initialValue={eventAddress}
          onAddressSelect={(data) => {
            setField("eventAddress", data.address);
            setField("eventAddressData", {
              street: data.address ?? "",
              city: data.city ?? "",
              stateProvince: data.state ?? "",
              zipPostal: data.postalCode ?? "",
              lat: data.lat,
              lng: data.lng,
              placeId: data.placeId,
              country: data.country,
            });
          }}
          className="h-[40px] px-3 border rounded text-sm"
        />
        {eventAddressData?.city && (
          <p className="text-xs text-gray-500 mt-1">
            {eventAddressData.city}
            {eventAddressData.stateProvince ? `, ${eventAddressData.stateProvince}` : ""}
            {eventAddressData.zipPostal ? ` ${eventAddressData.zipPostal}` : ""}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Start <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={eventStart}
            min={today}
            onChange={(e) => {
              const val = e.target.value;
              setField("eventStart", val);
              if (eventEnd && val && eventEnd < val) {
                setField("eventEnd", val);
              }
            }}
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event End <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={eventEnd}
            min={eventStart || today}
            onChange={(e) => setField("eventEnd", e.target.value)}
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
      </div>
    </section>
  );
}
