"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import usePlacesAutocomplete, { getGeocode } from "use-places-autocomplete";
import { useCurrentEventStore } from "../../bleachers-dashboard/_lib/useCurrentEventStore";

interface AddressData {
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface AddressAutocompleteProps {
  onAddressSelect: (data: AddressData) => void;
  initialValue?: string;
}

export default function AddressAutocomplete({
  onAddressSelect,
  initialValue,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0, width: 0 });
  const addressData = useCurrentEventStore().addressData;
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    defaultValue: initialValue,
    debounce: 300,
  });

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue, false);
    } else {
      setValue(addressData?.address ?? "", false);
    }
  }, [initialValue, addressData]);

  useEffect(() => {
    if (status === "OK" && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setSuggestionPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [status]);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const components = results[0].address_components;

      const state = components.find((comp: AddressComponent) =>
        comp.types.includes("administrative_area_level_1")
      )?.long_name;

      const city = components.find((comp: AddressComponent) =>
        comp.types.includes("locality")
      )?.long_name;

      const postalCode = components.find((comp: AddressComponent) =>
        comp.types.includes("postal_code")
      )?.long_name;

      onAddressSelect({ address, city, state, postalCode });
    } catch (error) {
      console.error("Error fetching address details:", error);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <input
          ref={inputRef}
          className="w-full p-2 border rounded"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder="Enter address..."
        />
      </div>

      {typeof window !== "undefined" &&
        createPortal(
          status === "OK" ? (
            <ul
              className="absolute bg-white border shadow-lg rounded z-[9999]"
              style={{
                top: suggestionPos.top,
                left: suggestionPos.left,
                width: suggestionPos.width,
                position: "absolute",
              }}
            >
              {data.map(({ place_id, description }) => (
                <li
                  key={place_id}
                  className="p-2 cursor-pointer hover:bg-gray-200 text-sm"
                  onClick={() => handleSelect(description)}
                >
                  {description}
                </li>
              ))}
            </ul>
          ) : null,
          document.body
        )}
    </>
  );
}
